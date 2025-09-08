// Define interfaces for nested objects in the Shoot resource
interface Worker {
  name: string;
  cri: {
    name: string;
  };
  minimum: number;
  maximum: number;
  maxSurge: number;
  maxUnavailable: number;
  machine: {
    architecture: string;
    type: string;
    image: {
      name: string;
      version: string;
    };
  };
  volume: {
    type: string;
    size: string;
  };
}

interface WorkersSettings {
  sshAccess: {
    enabled: boolean;
  };
}

interface Addons {
  kubernetesDashboard: {
    authenticationMode: string;
    enabled: boolean;
  };
  nginxIngress: {
    enabled: boolean;
    externalTrafficPolicy: string;
  };
}

interface Networking {
  type: string;
  ipFamilies: string[];
  pods: string;
  nodes: string;
  services: string;
}

interface Maintenance {
  timeWindow: {
    begin: string;
    end: string;
  };
  autoUpdate: {
    kubernetesVersion: boolean;
    machineImageVersion: boolean;
  };
}

interface Hibernation {
  enabled: boolean;
}

// Main interface for the Shoot resource
export interface Shoot {
  apiVersion: string;
  kind: string;
  metadata: {
    name: string;
    namespace: string;
    generation: number;
    labels: {
      [key: string]: string;
    };
  };
  spec: {
    credentialsBindingName: string;
    cloudProfile: {
      kind: string;
      name: string;
    };
    schedulerName: string;
    addons: Addons;
    provider: {
      controlPlaneConfig: {
        apiVersion: string;
        kind: string;
        zone: string;
      };
      infrastructureConfig: {
        apiVersion: string;
        kind: string;
        networks: {
          workers: string;
        };
      };
      type: string;
      workers: Worker[];
      workersSettings: WorkersSettings;
    };
    purpose: string;
    region: string;
    kubernetes: {
      version: string;
    };
    networking: Networking;
    maintenance: Maintenance;
    hibernation: Hibernation;
  };
}

export function getDefaultShoot(): Shoot {
  return {
    apiVersion: 'core.gardener.cloud/v1beta1',
    kind: 'Shoot',
    metadata: {
      name: '', // This should always be set by the user
      namespace: 'garden-demo',
      generation: 1,
      labels: {
        'managed-service.codesphere.com/id': '', // This should always be set by the user
      },
    },
    spec: {
      credentialsBindingName: 'csa-demo-gcp-secret',
      cloudProfile: {
        kind: 'CloudProfile',
        name: 'gcp',
      },
      schedulerName: 'default-scheduler',
      addons: {
        kubernetesDashboard: {
          authenticationMode: 'token',
          enabled: false,
        },
        nginxIngress: {
          enabled: false,
          externalTrafficPolicy: 'Cluster',
        },
      },
      provider: {
        controlPlaneConfig: {
          apiVersion: 'gcp.provider.extensions.gardener.cloud/v1alpha1',
          kind: 'ControlPlaneConfig',
          zone: 'europe-west1-b',
        },
        infrastructureConfig: {
          apiVersion: 'gcp.provider.extensions.gardener.cloud/v1alpha1',
          kind: 'InfrastructureConfig',
          networks: {
            workers: '10.250.0.0/16',
          },
        },
        type: 'gcp',
        workers: [
          {
            name: 'worker-g2e24',
            cri: { name: 'containerd' },
            minimum: 1,
            maximum: 2,
            maxSurge: 1,
            maxUnavailable: 0,
            machine: {
              architecture: 'amd64',
              type: 'n1-standard-4',
              image: { name: 'ubuntu', version: '22.0.4' },
            },
            volume: { type: 'pd-standard', size: '50Gi' },
          },
        ],
        workersSettings: {
          sshAccess: { enabled: true },
        },
      },
      purpose: 'evaluation',
      region: 'europe-west1',
      kubernetes: {
        version: '1.32.5',
      },
      networking: {
        type: 'calico',
        ipFamilies: ['IPv4'],
        pods: '100.96.0.0/11',
        nodes: '10.250.0.0/16',
        services: '100.64.0.0/13',
      },
      maintenance: {
        timeWindow: {
          begin: '220000+0100',
          end: '230000+0100',
        },
        autoUpdate: {
          kubernetesVersion: true,
          machineImageVersion: true,
        },
      },
      hibernation: { enabled: false },
    },
  };
}