import { globalConfig } from "../env.js";

export type KubeconfigResponse = {
  kubeconfig: string;
  namespace: string;
};

/**
 * Kubeconfig provider service
 * Fetches user-scoped kubeconfigs from an external provider or uses fallback
 */
export class KubeconfigProvider {
  /**
   * Get kubeconfig and namespace for a managed service instance
   * @param managedServiceId The managed service ID
   * @param userToken Optional user token for authentication with external provider
   */
  async getKubeconfig(managedServiceId: string, userToken?: string): Promise<KubeconfigResponse> {
    if (globalConfig.kubeconfigProviderEndpoint) {
      return this.fetchFromExternalProvider(managedServiceId, userToken);
    }

    return this.getFallbackKubeconfig(managedServiceId);
  }

  /**
   * Fetch kubeconfig from external provider
   */
  private async fetchFromExternalProvider(
    managedServiceId: string,
    userToken?: string,
  ): Promise<KubeconfigResponse> {
    const endpoint = globalConfig.kubeconfigProviderEndpoint!;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (userToken) {
      headers.Authorization = `Bearer ${userToken}`;
    }

    try {
      const response = await fetch(`${endpoint}/${managedServiceId}`, {
        method: "GET",
        headers,
      });

      if (!response.ok) {
        throw new Error(`Kubeconfig provider returned ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        kubeconfig: data.kubeconfig,
        namespace: data.namespace,
      };
    }
    catch (error) {
      console.error("Error fetching kubeconfig from external provider:", error);
      throw new Error(`Failed to fetch kubeconfig: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  /**
   * Get fallback kubeconfig (shared cluster mode)
   * Uses the globally configured kubeconfig and generates namespace from pattern
   */
  private getFallbackKubeconfig(managedServiceId: string): KubeconfigResponse {
    if (!globalConfig.fallbackKubeconfig) {
      throw new Error("FALLBACK_KUBECONFIG is not configured");
    }

    const namespace = globalConfig.namespacePattern.replace("{id}", managedServiceId);

    return {
      kubeconfig: globalConfig.fallbackKubeconfig,
      namespace,
    };
  }
}

export const kubeconfigProvider = new KubeconfigProvider();
