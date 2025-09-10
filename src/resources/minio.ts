export interface Application {
  apiVersion: string;
  kind: string;
  metadata: {
    name: string;
    namespace: string;
    labels: {
      [key: string]: string;
    };
  };
  spec: {
    project: string;
    source: {
      repoURL: string;
      path: string;
      targetRevision: string;
      helm: {
        parameters: Array<{
          name: string;
          value: string;
        }>;
      };
    };
    destination: {
      server: string;
      namespace: string;
    };
    syncPolicy: {
      automated: {
        prune: boolean;
        selfHeal: boolean;
      };
      syncOptions: string[];
    };
  };
}

export function getDefaultMinioApplication(): Application {
  return {
    apiVersion: 'argoproj.io/v1alpha1',
    kind: 'Application',
    metadata: {
      name: 'minio-codesphere',
      namespace: 'argocd',
      labels: {
        'managed-service.codesphere.com/id': '', // This should always be set by the user
      },
    },
    spec: {
      project: 'default',
      source: {
        repoURL: 'git@gitlab.opencode.de:govtech-deutschland/govtech-platform/gtp-cloud-abstraction.git',
        path: 'manifests/minio/minio-tenant',
        targetRevision: 'feature/codesphere',
        helm: {
          parameters: [
            {
              name: 'serverstransport',
              value: 'minio-tenant-codesphere-insecure-transport@kubernetescrd',
            },
            {
              name: 'ingressHost',
              value: 'codesphere-minio.dev.medicuscloud.org',
            },
            {
              name: 's3ingressHost',
              value: 's3-codesphere-minio.dev.medicuscloud.org',
            },
            {
              name: 'tenant.pools[0].size',
              value: '1Gi',
            },
            {
              name: 'tenant.pools[0].volumesPerServer',
              value: '1',
            },
            {
              name: 'tenant.pools[0].name',
              value: 'pool-codesphere',
            },
          ],
        },
      },
      destination: {
        server: 'https://kubernetes.default.svc',
        namespace: 'minio-tenant-codesphere',
      },
      syncPolicy: {
        automated: {
          prune: true,
          selfHeal: true,
        },
        syncOptions: [
          'CreateNamespace=true',
        ],
      },
    },
  };
}