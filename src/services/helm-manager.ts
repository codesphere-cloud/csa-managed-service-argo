import * as k8s from "@kubernetes/client-node";

import type { Config, HelmReleaseMetadata, Secrets } from "../types/config.js";

import { env, globalConfig } from "../env.js";
import { helmClient } from "./helm.js";
import { kubeconfigProvider } from "./kubeconfig-provider.js";

/**
 * Manages Helm releases with metadata tracking via Kubernetes ConfigMaps
 */
export class HelmManager {
  private k8sApi: k8s.CoreV1Api;
  private kubeConfig: k8s.KubeConfig;
  private metadataNamespace = "helm-managed-services";
  private metadataLabelKey = "managed-service.codesphere.com/id";

  constructor(kubeConfigPath?: string) {
    this.kubeConfig = new k8s.KubeConfig();

    if (kubeConfigPath) {
      this.kubeConfig.loadFromFile(kubeConfigPath);
      if (env.NODE_ENV === "development") {
        console.warn(`🔧 HelmManager using kubeconfig: ${kubeConfigPath}`);
      }
    }
    else {
      this.kubeConfig.loadFromDefault();
      if (env.NODE_ENV === "development") {
        console.warn("🔧 HelmManager using default kubeconfig");
      }
    }

    this.k8sApi = this.kubeConfig.makeApiClient(k8s.CoreV1Api);
  }

  /**
   * Ensure the metadata namespace exists
   */
  private async ensureMetadataNamespace(): Promise<void> {
    try {
      await this.k8sApi.readNamespace({ name: this.metadataNamespace });
    }
    catch (error: any) {
      if (error.statusCode === 404 || error.code === 404) {
        // Create the namespace
        const namespace: k8s.V1Namespace = {
          metadata: {
            name: this.metadataNamespace,
          },
        };
        try {
          await this.k8sApi.createNamespace({ body: namespace });
          if (env.NODE_ENV === "development") {
            console.warn(`✅ Created metadata namespace: ${this.metadataNamespace}`);
          }
        }
        catch (createError: any) {
          // If namespace already exists (409 conflict), ignore
          if (createError.statusCode === 409 || createError.code === 409) {
            return;
          }
          throw createError;
        }
      }
      else {
        throw error;
      }
    }
  }

  /**
   * Store metadata for a Helm release
   */
  private async storeMetadata(metadata: HelmReleaseMetadata): Promise<void> {
    await this.ensureMetadataNamespace();

    const configMap: k8s.V1ConfigMap = {
      metadata: {
        name: `helm-release-${metadata.id}`,
        namespace: this.metadataNamespace,
        labels: {
          [this.metadataLabelKey]: metadata.id,
        },
      },
      data: {
        metadata: JSON.stringify(metadata),
      },
    };

    try {
      await this.k8sApi.createNamespacedConfigMap({
        namespace: this.metadataNamespace,
        body: configMap,
      });
    }
    catch (error: any) {
      if (error.statusCode === 409 || error.code === 409) {
        // ConfigMap already exists, update it
        await this.k8sApi.replaceNamespacedConfigMap({
          name: `helm-release-${metadata.id}`,
          namespace: this.metadataNamespace,
          body: configMap,
        });
      }
      else {
        throw error;
      }
    }
  }

  /**
   * Get metadata for a Helm release
   */
  private async getMetadata(id: string): Promise<HelmReleaseMetadata | null> {
    try {
      const configMap = await this.k8sApi.readNamespacedConfigMap({
        name: `helm-release-${id}`,
        namespace: this.metadataNamespace,
      });

      if (configMap.data?.metadata) {
        return JSON.parse(configMap.data.metadata);
      }

      return null;
    }
    catch (error: any) {
      if (error.statusCode === 404 || error.code === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Delete metadata for a Helm release
   */
  private async deleteMetadata(id: string): Promise<void> {
    try {
      await this.k8sApi.deleteNamespacedConfigMap({
        name: `helm-release-${id}`,
        namespace: this.metadataNamespace,
      });
    }
    catch (error: any) {
      if (error.statusCode === 404 || error.code === 404) {
        // Already deleted, ignore
        return;
      }
      throw error;
    }
  }

  /**
   * List all managed Helm releases
   */
  async listReleases(ids?: string[]): Promise<HelmReleaseMetadata[]> {
    try {
      await this.ensureMetadataNamespace();

      const labelSelector = `${this.metadataLabelKey}`;
      const configMaps = await this.k8sApi.listNamespacedConfigMap({
        namespace: this.metadataNamespace,
        labelSelector,
      });

      const releases: HelmReleaseMetadata[] = [];

      for (const configMap of configMaps.items) {
        if (configMap.data?.metadata) {
          const metadata: HelmReleaseMetadata = JSON.parse(configMap.data.metadata);

          // Filter by IDs if provided
          if (!ids || ids.length === 0 || ids.includes(metadata.id)) {
            releases.push(metadata);
          }
        }
      }

      return releases;
    }
    catch {
      // If we can't access metadata (e.g., namespace doesn't exist or no permissions),
      // return empty list or log warning in development
      if (env.NODE_ENV === "development") {
        console.warn(
          `⚠️  Cannot access metadata namespace (${this.metadataNamespace}). This is normal if no releases have been created yet.`,
        );
      }
      return [];
    }
  }

  /**
   * Create a new Helm release (idempotent)
   */
  async createRelease(
    id: string,
    config: Config,
    secrets?: Secrets,
    userToken?: string,
  ): Promise<HelmReleaseMetadata> {
    // Check if release already exists (idempotency)
    const existingMetadata = await this.getMetadata(id);
    if (existingMetadata) {
      if (env.NODE_ENV === "development") {
        console.warn(
          `⚠️  Release ${existingMetadata.releaseName} already exists for ID ${id}, returning existing metadata`,
        );
      }
      return existingMetadata;
    }

    const { kubeconfig, namespace } = await kubeconfigProvider.getKubeconfig(id, userToken);

    // Use managed-{id} as the release name
    const releaseName = `managed-${id}`;

    // Merge helmValues from config and sensitiveHelmValues from secrets
    const allValues = {
      ...config.helmValues,
      ...secrets?.sensitiveHelmValues,
    };

    // Install the Helm chart
    await helmClient.install({
      releaseName,
      namespace,
      repoUrl: config.repoUrl,
      path: config.path,
      targetRevision: config.targetRevision,
      kubeConfig: kubeconfig,
      values: allValues,
      createNamespace: true,
    });

    // Store metadata
    const metadata: HelmReleaseMetadata = {
      id,
      releaseName,
      namespace,
      repoUrl: config.repoUrl,
      targetRevision: config.targetRevision,
      path: config.path,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await this.storeMetadata(metadata);

    return metadata;
  }

  /**
   * Update an existing Helm release
   */
  async updateRelease(
    id: string,
    config?: Partial<Config>,
    secrets?: Secrets,
    userToken?: string,
  ): Promise<HelmReleaseMetadata> {
    const existingMetadata = await this.getMetadata(id);
    if (!existingMetadata) {
      throw new Error(`Release with id ${id} not found`);
    }

    const { kubeconfig } = await kubeconfigProvider.getKubeconfig(id, userToken);

    // Merge configurations
    const repoUrl = config?.repoUrl ?? existingMetadata.repoUrl;
    const targetRevision = config?.targetRevision ?? existingMetadata.targetRevision;
    const path = config?.path ?? existingMetadata.path;

    // Merge helmValues from config and sensitiveHelmValues from secrets
    const allValues = {
      ...config?.helmValues,
      ...secrets?.sensitiveHelmValues,
    };

    await helmClient.upgrade({
      releaseName: existingMetadata.releaseName,
      namespace: existingMetadata.namespace,
      repoUrl,
      path,
      targetRevision,
      kubeConfig: kubeconfig,
      values: allValues,
      install: false,
    });

    const updatedMetadata: HelmReleaseMetadata = {
      ...existingMetadata,
      repoUrl,
      targetRevision,
      path,
      updatedAt: new Date().toISOString(),
    };

    await this.storeMetadata(updatedMetadata);

    return updatedMetadata;
  }

  /**
   * Delete a Helm release
   */
  async deleteRelease(id: string, userToken?: string): Promise<void> {
    const metadata = await this.getMetadata(id);
    if (!metadata) {
      throw new Error(`Release with id ${id} not found`);
    }

    // Get kubeconfig from provider
    const { kubeconfig } = await kubeconfigProvider.getKubeconfig(id, userToken);

    // Uninstall the Helm release
    await helmClient.uninstall({
      releaseName: metadata.releaseName,
      namespace: metadata.namespace,
      kubeConfig: kubeconfig,
    });

    // Delete metadata
    await this.deleteMetadata(id);
  }

  /**
   * Get details of a specific Helm release including live status
   */
  async getReleaseDetails(id: string, userToken?: string): Promise<any> {
    const metadata = await this.getMetadata(id);
    if (!metadata) {
      throw new Error(`Release with id ${id} not found`);
    }

    try {
      // Get kubeconfig from provider
      const { kubeconfig } = await kubeconfigProvider.getKubeconfig(id, userToken);

      const status = await helmClient.status(metadata.releaseName, metadata.namespace, kubeconfig);

      if (env.NODE_ENV === "development") {
        console.warn(`📊 Helm status for ${metadata.releaseName}: ${status.info?.status || "undefined"}`);
      }

      return {
        metadata,
        status: {
          status: status.info?.status || "pending",
          description: status.info?.description,
          lastDeployed: status.info?.last_deployed,
          notes: status.info?.notes,
        },
      };
    }
    catch (error) {
      // If we can't get status, return metadata only
      if (env.NODE_ENV === "development") {
        console.warn(`⚠️  Failed to get Helm status for ${metadata.releaseName}:`, error);
      }
      return {
        metadata,
        status: {
          status: "unknown",
          error: error instanceof Error ? error.message : "Failed to get status",
        },
      };
    }
  }
}

export const helmManager = new HelmManager(globalConfig.fallbackKubeconfig);
