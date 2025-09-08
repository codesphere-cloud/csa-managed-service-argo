import * as k8s from '@kubernetes/client-node';
import fetch from 'node-fetch';
import https from 'node:https';
import { Buffer } from 'buffer';

// 1. Set up Kubernetes client configuration
const kc = new k8s.KubeConfig();
kc.loadFromDefault();

// Get the current user and cluster to build authentication options
const currentUser = kc.getCurrentUser();
const currentCluster = kc.getCurrentCluster();

if (!currentUser || !currentCluster) {
    throw new Error('Invalid kubeconfig. Could not find current user or cluster.');
}

// 2. Create an HTTPS agent to handle TLS certificates from kubeconfig
const agent = new https.Agent({
    ca: currentCluster.caData ? Buffer.from(currentCluster.caData, 'base64').toString('utf8') : undefined,
    cert: currentUser.certData ? Buffer.from(currentUser.certData, 'base64').toString('utf8') : undefined,
    key: currentUser.keyData ? Buffer.from(currentUser.keyData, 'base64').toString('utf8') : undefined,
    keepAlive: true,
});

// The headers and agent to be used for the fetch call
const opts = {
    headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${currentUser.token}`,
    },
    agent: agent,
};

/**
 * Fetches the admin kubeconfig for a specified Shoot resource using the raw fetch API.
 * This is a reusable function for interacting with the adminkubeconfig subresource.
 * @param shootName The name of the Shoot resource.
 * @param namespace The namespace of the Shoot resource.
 * @returns The decoded kubeconfig string.
 */
export async function getAdminKubeconfig(shootName: string, namespace: string): Promise<string | null> {
    const group = 'core.gardener.cloud';
    const version = 'v1beta1';
    const subresource = 'adminkubeconfig';
    const method = 'POST';
    
    // Construct the full API path
    const url = `${currentCluster.server}/apis/${group}/${version}/namespaces/${namespace}/shoots/${shootName}/${subresource}`;

    // The payload for the request
    const body = {
        spec: {
            expirationSeconds: 600,
        }
    };

    try {
        const response = await fetch(url, {
            method: method,
            headers: opts.headers,
            agent: opts.agent,
            body: JSON.stringify(body),
        });

        const responseBody = await response.json();

        if (!response.ok) {
             throw new Error(`API returned status code ${response.status}: ${JSON.stringify(responseBody)}`);
        }

        if (responseBody && responseBody.status?.kubeconfig) {
            // The kubeconfig is base64-encoded, so you must decode it
            const base64Kubeconfig = responseBody.status.kubeconfig;
            const kubeconfig = Buffer.from(base64Kubeconfig, 'base64').toString('utf-8');
            
            console.log('Successfully fetched admin kubeconfig:');
            console.log(kubeconfig);
            return kubeconfig;
        } else {
            console.error('Kubeconfig not found in the response.');
            return null;
        }
    } catch (err: any) {
        console.error('Error fetching admin kubeconfig:', err.message);
        return null;
    }
}