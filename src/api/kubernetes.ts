import * as k8s from '@kubernetes/client-node';
import express from "express";

import {Shoot, getDefaultShoot} from '../resources/k8s'; 
import { getAdminKubeconfig } from '../lib/gardener-helpers';
const router = express.Router();

const kc = new k8s.KubeConfig();
kc.loadFromDefault();

const k8sApi = kc.makeApiClient(k8s.CustomObjectsApi);

const tenantObj = {
    namespace: 'garden-demo',
    singular: 'shoot',
    plural: 'shoots',
    group: 'core.gardener.cloud',
    version: 'v1beta1',
};

const plan = {
    id: 0,
    workerMin: 1,
    workerMax: 2,
    maxUnavailable: 0,
};

function getShortId(id: string): string {
  return id.split('-')[0];
}

const getShootName = (id: string) => `managed-${getShortId(id)}`;

router.get('/', async (req, res) => {
    const ids = req.query.id;
    try {
        const response = await k8sApi.listNamespacedCustomObject(tenantObj);
        const shootRes = response.items;
        
        if (!Array.isArray(shootRes)) {
            // Log the response to understand why it isn't an array
            console.error('API response is not an array:', shootRes);
            return res.status(500).json({ error: 'Unexpected API response format.' });
        }

        // Convert query IDs to an array for consistent filtering
        const requestedIds = Array.isArray(ids) ? ids : (ids ? [ids] : []);

        const filteredShoots = shootRes.filter((s: any) => {
            const shootId = s.metadata?.labels?.['managed-service.codesphere.com/id'];
            if (!shootId) {
                return false; // Skip objects without the required label
            }
            // If no IDs were requested, return all Shoots.
            // Otherwise, check if the Shoot's ID is in the requested IDs array.
            return requestedIds.length === 0 || requestedIds.includes(shootId);
        });

        // If no IDs were specifically requested, return the filtered list of IDs
        if (requestedIds.length === 0) {
            return res.json(filteredShoots.map((s: any) => s.metadata.labels['managed-service.codesphere.com/id']));
        }

        // Use Promise.all to wait for all asynchronous calls to complete
        const shootsWithKubeconfig = await Promise.all(filteredShoots.map(async (s: any) => {
            const shootName = s.metadata.name;
            const namespace = s.metadata.namespace;

            // Call the new function and await the result
            const kubeconfig = await getAdminKubeconfig(shootName, namespace);

            return {
                [s.metadata.labels['managed-service.codesphere.com/id']]: {
                    plan,
                    config: {},
                    details: {
                      status: s.metadata.labels['shoot.gardener.cloud/status'],
                      kubeconfig: kubeconfig, // <-- Populate the kubeconfig field
                    },
                },
            };
        }));

        res.json(shootsWithKubeconfig);
    }
    catch (err) {
      console.error('Error fetching Shoot:', err);
      res.status(500).json({ message: 'Error fetching Shoot', error: err });
    }
});

router.post('/', async (req, res) => {
    const { id } = req.body;

    // Get the default object
    const shoot: Shoot = getDefaultShoot();

    // Shorten since shoot name is limited in size
    const shortId: string = getShortId(id);

    shoot.metadata.name = getShootName(id);
    shoot.metadata.labels['managed-service.codesphere.com/id'] = id;

    try {
      const result = await k8sApi.createNamespacedCustomObject({
            ...tenantObj,
            body: shoot,
        });
      console.log('Gardener Shoot created successfully:', result.body);
      res.status(201).json({ message: 'Gardener Shoot created successfully' });
    } 
    catch (err) {
      console.error('Error creating Gardener Shoot:', err);
      res.status(500).json({ message: 'Error creating Gardener Shoot', error: err });
    }
});

router.patch('/:id', async (req, res) => {
    // noop. Only 1 plan exists and no config options
    res.status(200);
});

router.delete('/:id', async (req, res) => {
    const id = req.params.id;
    try {

        // // Step 1: Add the required annotation for deletion confirmation
        // see https://gardener.cloud/docs/guides/administer-shoots/create-delete-shoot/
     
        const annotationPatch = [
            {
                op: 'add',
                path: '/metadata/annotations/confirmation.gardener.cloud~1deletion',
                value: 'true'
            }
        ];

        await k8sApi.patchNamespacedCustomObject({
            ...tenantObj,
            name: getShootName(id),
            body: annotationPatch,
        }
        );

        await k8sApi.deleteNamespacedCustomObject({
            ...tenantObj,
            name: getShootName(id),
        });
        res.status(202).json({ message: `Gardener Shoot ${getShootName(id)} deleted successfully` })
    }
    catch (err) {
        console.error(`Error creating Gardener Shoot ${getShootName(id)}:`, err);
      res.status(500).json({ message: `Error deleting Gardener Shoot ${getShootName(id)}:`, error: err });
    }
});

export default router;