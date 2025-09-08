import * as k8s from '@kubernetes/client-node';
import express from "express";

import {Shoot, getDefaultShoot} from '../resources/k8s'; 

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

        const filteredShoots = shootRes.filter((s: any) => {
            // Check if 'labels' and the specific label exist on the object
            return s.metadata && s.metadata.labels && s.metadata.labels['managed-service.codesphere.com/id'];
        });

        if (!ids) {
            res.json(filteredShoots.map((s: any) => s.metadata.labels['managed-service.codesphere.com/id']));
            return;
        }
        res.json(filteredShoots.map((s: any) => ({
            [s.labels['managed-service.codesphere.com/id']]: {
                plan,
                config: {},
                details: {
                  healthy: false,
                  kubeconfig: '',
                },
            },
        })));
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