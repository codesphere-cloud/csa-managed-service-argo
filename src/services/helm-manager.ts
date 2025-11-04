import * as k8s from '@kubernetes/client-node';
import { helmClient } from './helm';
import { globalConfig } from '../env';
import type { Config, Secrets, HelmReleaseMetadata } from '../types/config';

/**
 * Manages Helm releases with metadata tracking via Kubernetes ConfigMaps
 */
export class HelmManager {
  private k8sApi: k8s.CoreV1Api;
  private kubeConfig: k8s.KubeConfig;
  private metadataNamespace = 'helm-managed-services';
  private metadataLabelKey = 'managed-service.codesphere.com/id';

  constructor(kubeConfigPath?: string) {
    this.kubeConfig = new k8s.KubeConfig();

    if (kubeConfigPath) {
      this.kubeConfig.loadFromFile(kubeConfigPath);
    } else {
      this.kubeConfig.loadFromDefault();
    }

    this.k8sApi = this.kubeConfig.makeApiClient(k8s.CoreV1Api);
  }

  /**
   * Ensure the metadata namespace exists
   */
  private async ensureMetadataNamespace(): Promise<void> {
    try {
      await this.k8sApi.readNamespace({ name: this.metadataNamespace });
    } catch (error: any) {
      if (error.statusCode === 404) {
        // Create the namespace
        const namespace: k8s.V1Namespace = {
          metadata: {
            name: this.metadataNamespace,
          },
        };
        await this.k8sApi.createNamespace({ body: namespace });
        console.log(`Created metadata namespace: ${this.metadataNamespace}`);
      } else {
        throw error;
      }
    }
  }

  /**
   * Generate namespace from pattern
   */
  private generateNamespace(id: string): string {
    if (globalConfig.mode === 'custom_cluster') {
      throw new Error('generateNamespace should not be called in custom_cluster mode');
    }

    if (!globalConfig.namespacePattern) {
      throw new Error('namespacePattern is required in shared_cluster mode');
    }

    // Replace {id} in the pattern with the managed service ID
    return globalConfig.namespacePattern.replace('{id}', id);
  }

  /**
   * Get kubeconfig path based on mode
   */
  private getKubeConfig(config: Config): string | undefined {
    if (globalConfig.mode === 'custom_cluster') {
      if (!config.kubeConfig) {
        throw new Error('kubeConfig is required in config for custom_cluster mode');
      }
      return config.kubeConfig;
    } else {
      return globalConfig.kubeConfig;
    }
  }

  /**
   * Get namespace based on mode
   */
  private getNamespace(id: string, config: Config): string {
    if (globalConfig.mode === 'custom_cluster') {
      if (!config.namespace) {
        throw new Error('namespace is required in config for custom_cluster mode');
      }
      return config.namespace;
    } else {
      return this.generateNamespace(id);
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
    } catch (error: any) {
      if (error.statusCode === 409) {
        // ConfigMap already exists, update it
        await this.k8sApi.replaceNamespacedConfigMap({
          name: `helm-release-${metadata.id}`,
          namespace: this.metadataNamespace,
          body: configMap,
        });
      } else {
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
    } catch (error: any) {
      if (error.statusCode === 404) {
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
    } catch (error: any) {
      if (error.statusCode === 404) {
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

  /**
   * Create a new Helm release
   */
  async createRelease(
    id: string,
    config: Config,
    secrets?: Secrets,
  ): Promise<HelmReleaseMetadata> {
    const namespace = this.getNamespace(id, config);
    const kubeConfig = this.getKubeConfig(config);
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
      kubeConfig,
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
  ): Promise<HelmReleaseMetadata> {
    const existingMetadata = await this.getMetadata(id);
    if (!existingMetadata) {
      throw new Error(`Release with id ${id} not found`);
    }

    // Merge configurations
    const repoUrl = config?.repoUrl ?? existingMetadata.repoUrl;
    const targetRevision = config?.targetRevision ?? existingMetadata.targetRevision;
    const path = config?.path ?? existingMetadata.path;
    const kubeConfig = config?.kubeConfig ?? (globalConfig.mode === 'shared_cluster' ? globalConfig.kubeConfig : undefined);

    // Merge helmValues from config and sensitiveHelmValues from secrets
    const allValues = {
      ...config?.helmValues,
      ...secrets?.sensitiveHelmValues,
    };

    // Upgrade the Helm release
    await helmClient.upgrade({
      releaseName: existingMetadata.releaseName,
      namespace: existingMetadata.namespace,
      repoUrl,
      path,
      targetRevision,
      kubeConfig,
      values: allValues,
      install: false,
    });

    // Update metadata
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
  async deleteRelease(id: string): Promise<void> {
    const metadata = await this.getMetadata(id);
    if (!metadata) {
      throw new Error(`Release with id ${id} not found`);
    }

    const kubeConfig = globalConfig.mode === 'custom_cluster' ? undefined : globalConfig.kubeConfig;

    // Uninstall the Helm release
    await helmClient.uninstall({
      releaseName: metadata.releaseName,
      namespace: metadata.namespace,
      kubeConfig,
    });

    // Delete metadata
    await this.deleteMetadata(id);
  }

  /**
   * Get details of a specific Helm release including live status
   */
  async getReleaseDetails(id: string): Promise<any> {
    const metadata = await this.getMetadata(id);
    if (!metadata) {
      throw new Error(`Release with id ${id} not found`);
    }

    const kubeConfig = globalConfig.mode === 'custom_cluster' ? undefined : globalConfig.kubeConfig;

    try {
      const status = await helmClient.status(metadata.releaseName, metadata.namespace, kubeConfig);
      return {
        metadata,
        status: {
          status: status.info?.status,
          description: status.info?.description,
          lastDeployed: status.info?.last_deployed,
          notes: status.info?.notes,
        },
      };
    } catch (error) {
      // If we can't get status, return metadata only
      return {
        metadata,
        status: {
          status: 'unknown',
          error: error instanceof Error ? error.message : 'Failed to get status',
        },
      };
    }
  }
}

export const helmManager = new HelmManager();
