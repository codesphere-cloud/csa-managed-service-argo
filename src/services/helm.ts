import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

const execAsync = promisify(exec);

export interface HelmInstallOptions {
  releaseName: string;
  namespace: string;
  repoUrl: string;
  path: string;
  targetRevision: string;
  kubeConfig?: string;
  values?: Record<string, any>;
  createNamespace?: boolean;
}

export interface HelmUpgradeOptions extends HelmInstallOptions {
  install?: boolean; // If true, install if not already installed
}

export interface HelmUninstallOptions {
  releaseName: string;
  namespace: string;
  kubeConfig?: string;
}

export interface HelmListOptions {
  namespace?: string;
  kubeConfig?: string;
  allNamespaces?: boolean;
}

export interface HelmRelease {
  name: string;
  namespace: string;
  revision: string;
  updated: string;
  status: string;
  chart: string;
  appVersion: string;
}

export class HelmClient {
  /**
   * Install a Helm chart from a Git repository
   */
  async install(options: HelmInstallOptions): Promise<void> {
    const {
      releaseName,
      namespace,
      repoUrl,
      path: chartPath,
      targetRevision,
      kubeConfig,
      values,
      createNamespace = true,
    } = options;

    // Clone the Git repository to a temporary directory
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'helm-chart-'));

    try {
      // Clone the repository
      await execAsync(`git clone --depth 1 --branch ${targetRevision} ${repoUrl} ${tempDir}`);

      const fullChartPath = path.join(tempDir, chartPath);

      // Build the helm install command
      const kubeconfigArg = kubeConfig ? `--kubeconfig ${kubeConfig}` : '';
      const namespaceArg = `--namespace ${namespace}`;
      const createNsArg = createNamespace ? '--create-namespace' : '';

      // Create values file if provided
      let valuesArg = '';
      if (values && Object.keys(values).length > 0) {
        const valuesFile = path.join(tempDir, 'values.yaml');
        const yaml = await import('js-yaml');
        await fs.writeFile(valuesFile, yaml.dump(values));
        valuesArg = `--values ${valuesFile}`;
      }

      const command = `helm install ${releaseName} ${fullChartPath} ${namespaceArg} ${createNsArg} ${valuesArg} ${kubeconfigArg}`.trim();

      console.log(`Executing: ${command}`);
      const { stdout, stderr } = await execAsync(command);

      if (stdout) console.log(stdout);
      if (stderr) console.error(stderr);
    } finally {
      // Clean up temporary directory
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  }

  /**
   * Upgrade a Helm release (or install if it doesn't exist)
   */
  async upgrade(options: HelmUpgradeOptions): Promise<void> {
    const {
      releaseName,
      namespace,
      repoUrl,
      path: chartPath,
      targetRevision,
      kubeConfig,
      values,
      install = true,
    } = options;

    // Clone the Git repository to a temporary directory
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'helm-chart-'));

    try {
      // Clone the repository
      await execAsync(`git clone --depth 1 --branch ${targetRevision} ${repoUrl} ${tempDir}`);

      const fullChartPath = path.join(tempDir, chartPath);

      // Build the helm upgrade command
      const kubeconfigArg = kubeConfig ? `--kubeconfig ${kubeConfig}` : '';
      const namespaceArg = `--namespace ${namespace}`;
      const installArg = install ? '--install' : '';

      // Create values file if provided
      let valuesArg = '';
      if (values && Object.keys(values).length > 0) {
        const valuesFile = path.join(tempDir, 'values.yaml');
        const yaml = await import('js-yaml');
        await fs.writeFile(valuesFile, yaml.dump(values));
        valuesArg = `--values ${valuesFile}`;
      }

      const command = `helm upgrade ${installArg} ${releaseName} ${fullChartPath} ${namespaceArg} ${valuesArg} ${kubeconfigArg}`.trim();

      console.log(`Executing: ${command}`);
      const { stdout, stderr } = await execAsync(command);

      if (stdout) console.log(stdout);
      if (stderr) console.error(stderr);
    } finally {
      // Clean up temporary directory
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  }

  /**
   * Uninstall a Helm release
   */
  async uninstall(options: HelmUninstallOptions): Promise<void> {
    const { releaseName, namespace, kubeConfig } = options;

    const kubeconfigArg = kubeConfig ? `--kubeconfig ${kubeConfig}` : '';
    const namespaceArg = `--namespace ${namespace}`;

    const command = `helm uninstall ${releaseName} ${namespaceArg} ${kubeconfigArg}`.trim();

    console.log(`Executing: ${command}`);
    const { stdout, stderr } = await execAsync(command);

    if (stdout) console.log(stdout);
    if (stderr) console.error(stderr);
  }

  /**
   * List Helm releases
   */
  async list(options: HelmListOptions = {}): Promise<HelmRelease[]> {
    const { namespace, kubeConfig, allNamespaces = false } = options;

    const kubeconfigArg = kubeConfig ? `--kubeconfig ${kubeConfig}` : '';
    const namespaceArg = namespace ? `--namespace ${namespace}` : '';
    const allNamespacesArg = allNamespaces ? '--all-namespaces' : '';
    const outputArg = '--output json';

    const command = `helm list ${namespaceArg} ${allNamespacesArg} ${outputArg} ${kubeconfigArg}`.trim();

    console.log(`Executing: ${command}`);
    const { stdout } = await execAsync(command);

    if (!stdout.trim()) {
      return [];
    }

    return JSON.parse(stdout);
  }

  /**
   * Get status of a Helm release
   */
  async status(releaseName: string, namespace: string, kubeConfig?: string): Promise<any> {
    const kubeconfigArg = kubeConfig ? `--kubeconfig ${kubeConfig}` : '';
    const namespaceArg = `--namespace ${namespace}`;
    const outputArg = '--output json';

    const command = `helm status ${releaseName} ${namespaceArg} ${outputArg} ${kubeconfigArg}`.trim();

    console.log(`Executing: ${command}`);
    const { stdout } = await execAsync(command);

    return JSON.parse(stdout);
  }
}

export const helmClient = new HelmClient();
