import * as k8s from '@kubernetes/client-node';
import express from "express";

import { getDefaultMinioApplication, Application} from '../resources/minio';


const router = express.Router();

const kc = new k8s.KubeConfig();
kc.loadFromDefault();

const k8sApi = kc.makeApiClient(k8s.CustomObjectsApi);

const applicationObj = {
    namespace: '',
    singular: 'application',
    plural: 'applications',
    group: 'core.gardener.cloud',
    version: 'v1beta1',
};

const plan = {
    id: 0,
    workerMin: 1,
    workerMax: 2,
    maxUnavailable: 0,
};

router.get('/', async (req, res) => {
    const ids = req.query.id;
    try {
        const response = await k8sApi.listNamespacedCustomObject(applicationObj);
        const applications = response.items;

        // Convert query IDs to an array for consistent filtering
        const requestedIds = Array.isArray(ids) ? ids : (ids ? [ids] : []);


        // If no IDs were specifically requested, return the filtered list of IDs
        if (requestedIds.length === 0) {
            return res.json(applications.map((s: any) => s.metadata.labels['managed-service.codesphere.com/id']));
        }

        // Use Promise.all to wait for all asynchronous calls to complete
        const applicationsWithDetails = await Promise.all(applications.map(async (s: any) => {
            const shootName = s.metadata.name;
            const namespace = s.metadata.namespace;

            return {
                [s.metadata.labels['managed-service.codesphere.com/id']]: {
                    plan,
                    config: {},
                    details: {
                      status: 'OK',
                    },
                },
            };
        }));

        res.json(applicationsWithDetails);
    }
    catch (err) {
      console.error('Error fetching Applications:', err);
      res.status(500).json({ message: 'Error fetching Applications:', error: err });
    }
});

router.post('/', async (req, res) => {
    const { id } = req.body;

    // Get the default object
    const appl: Application = getDefaultMinioApplication()

    appl.metadata.name = 'minio-codesphere-demo';
    appl.metadata.labels['managed-service.codesphere.com/id'] = id;

    try {
      const result = await k8sApi.createNamespacedCustomObject({
            ...applicationObj,
            body: appl,
        });
      console.log('Application created successfully:', result.body);
      res.status(201).json({ message: 'Application created successfully' });
    } 
    catch (err) {
      console.error('Error creating Applicationt:', err);
      res.status(500).json({ message: 'Error creating Applicationt', error: err });
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
            ...applicationObj,
            name: getShootName(id),
            body: annotationPatch,
        }
        );

        await k8sApi.deleteNamespacedCustomObject({
            ...applicationObj,
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