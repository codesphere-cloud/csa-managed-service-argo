import * as k8s from '@kubernetes/client-node';
import express from "express";

import * as yaml from 'js-yaml';

import { getDefaultMinioApplication, Application} from '../resources/minio';


const router = express.Router();

const kc = new k8s.KubeConfig();
kc.loadFromDefault();

const k8sApi = kc.makeApiClient(k8s.CustomObjectsApi);

const applicationObj = {
    namespace: 'argocd',
    singular: 'application',
    plural: 'applications',
    group: 'argoproj.io',
    version: 'v1alpha1',
};

const plan = {
    id: 0,
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

      // Convert the object to a YAML string for logging
      const yamlOutput = yaml.dump(appl);
    
      // Log the YAML string to the console
      console.log('Sending the following object to Kubernetes:\n' + yamlOutput);
    
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

        const response = await k8sApi.listNamespacedCustomObject(applicationObj);
        const applications = response.items;

        const appToDelete = applications.find((s: any) => s.metadata.labels['managed-service.codesphere.com/id'] === id);
        
        if (!appToDelete) {
            return res.status(404).json({ message: `No Application found with id ${id}` });
        }

        const appName = appToDelete.metadata.name

        await k8sApi.deleteNamespacedCustomObject({
            ...applicationObj,
            name: appName,
        });
        res.status(202).json({ message: `Application ${appName} deleted successfully` })
    }
    catch (err) {
        console.error(`Error deleting Application with id ${id}:`, err);
        res.status(500).json({ message: `Error deleting Application with id ${id}:`, error: err });
    }
});

export default router;