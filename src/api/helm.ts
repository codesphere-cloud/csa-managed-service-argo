import express from 'express';
import { helmManager } from '../services/helm-manager';
import {
  createManagedServiceRequestSchema,
  updateManagedServiceRequestSchema,
} from '../types/config';

const router = express.Router();

// Standard plan object for Codesphere managed service provider spec
const defaultPlan = {
  id: 0,
  parameters: {},
};

/**
 * @swagger
 * /api/v1/helm:
 *   get:
 *     summary: List all Helm releases
 *     description: Returns array of managed service IDs (Codesphere spec)
 *     tags: [Helm Releases]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Array of managed service IDs
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: string
 *                 format: uuid
 *               example: ["a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11", "b1ffbc99-9c0b-4ef8-bb6d-6bb9bd381a23"]
 *       401:
 *         description: Unauthorized - Missing or invalid token
 *       500:
 *         description: Server error
 */
router.get('/', async (req, res) => {
  try {
    const releases = await helmManager.listReleases();
    // Return just the array of IDs (Codesphere spec)
    res.json(releases.map(r => r.id));
  } catch (error) {
    console.error('Error listing Helm releases:', error);
    res.status(500).json({
      message: 'Error listing Helm releases',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * @swagger
 * /api/v1/helm:
 *   get:
 *     summary: Get status of specific Helm releases
 *     description: Returns detailed information about specified managed services (Codesphere spec)
 *     tags: [Helm Releases]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: id
 *         required: true
 *         schema:
 *           oneOf:
 *             - type: string
 *               format: uuid
 *             - type: array
 *               items:
 *                 type: string
 *                 format: uuid
 *         description: One or more managed service IDs (max 40)
 *     responses:
 *       200:
 *         description: Object with detailed information for each requested ID
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               additionalProperties:
 *                 type: object
 *                 properties:
 *                   plan:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       parameters:
 *                         type: object
 *                   config:
 *                     type: object
 *                   details:
 *                     type: object
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
// This route is handled by the same GET / handler with query parameter check

/**
 * @swagger
 * /api/v1/helm:
 *   post:
 *     summary: Create a new Helm release
 *     description: Deploy a new Helm chart instance (Codesphere spec)
 *     tags: [Helm Releases]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [id, plan, config]
 *             properties:
 *               id:
 *                 type: string
 *                 format: uuid
 *               plan:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *               config:
 *                 type: object
 *                 required: [repoUrl, targetRevision, path]
 *                 properties:
 *                   repoUrl:
 *                     type: string
 *                     format: uri
 *                   targetRevision:
 *                     type: string
 *                   path:
 *                     type: string
 *                   kubeConfig:
 *                     type: string
 *                   namespace:
 *                     type: string
 *                   helmValues:
 *                     type: object
 *               secrets:
 *                 type: object
 *                 properties:
 *                   sensitiveHelmValues:
 *                     type: object
 *           examples:
 *             shared_cluster:
 *               summary: Shared cluster mode
 *               value:
 *                 id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11"
 *                 plan:
 *                   id: 0
 *                 config:
 *                   repoUrl: "https://github.com/example/helm-charts.git"
 *                   targetRevision: "main"
 *                   path: "charts/webapp"
 *                   helmValues:
 *                     replicaCount: 2
 *                 secrets:
 *                   sensitiveHelmValues:
 *                     apiKey: "secret-value"
 *             custom_cluster:
 *               summary: Custom cluster mode
 *               value:
 *                 id: "b1ffbc99-9c0b-4ef8-bb6d-6bb9bd381a23"
 *                 plan:
 *                   id: 0
 *                 config:
 *                   repoUrl: "https://github.com/example/helm-charts.git"
 *                   targetRevision: "main"
 *                   path: "charts/webapp"
 *                   kubeConfig: "/path/to/kubeconfig"
 *                   namespace: "production"
 *                   helmValues:
 *                     replicaCount: 3
 *     responses:
 *       201:
 *         description: Helm release created successfully (empty body per Codesphere spec)
 *       400:
 *         description: Bad request - Invalid input
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/', async (req, res) => {
  try {
    const validationResult = createManagedServiceRequestSchema.safeParse(req.body);

    if (!validationResult.success) {
      return res.status(400).json({
        message: 'Invalid request body',
        errors: validationResult.error.issues,
      });
    }

    const { id, config, secrets } = validationResult.data;

    await helmManager.createRelease(id, config, secrets);

    // Return empty body (Codesphere spec)
    res.status(201).send();
  } catch (error) {
    console.error('Error creating Helm release:', error);
    res.status(500).json({
      message: 'Error creating Helm release',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * @swagger
 * /api/v1/helm/{id}:
 *   patch:
 *     summary: Update a Helm release
 *     description: Update an existing Helm release configuration (Codesphere spec)
 *     tags: [Helm Releases]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Managed service ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               config:
 *                 type: object
 *                 properties:
 *                   targetRevision:
 *                     type: string
 *                   helmValues:
 *                     type: object
 *               secrets:
 *                 type: object
 *                 properties:
 *                   sensitiveHelmValues:
 *                     type: object
 *           example:
 *             config:
 *               targetRevision: "v2.0.0"
 *               helmValues:
 *                 replicaCount: 5
 *     responses:
 *       200:
 *         description: Helm release updated successfully (empty body per Codesphere spec)
 *       400:
 *         description: Bad request - Invalid input
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Release not found
 *       500:
 *         description: Server error
 */
router.patch('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const validationResult = updateManagedServiceRequestSchema.safeParse(req.body);

    if (!validationResult.success) {
      return res.status(400).json({
        message: 'Invalid request body',
        errors: validationResult.error.issues,
      });
    }

    const { config, secrets } = validationResult.data;

    await helmManager.updateRelease(id, config, secrets);

    // Return empty body (Codesphere spec)
    res.status(200).send();
  } catch (error) {
    console.error(`Error updating Helm release ${req.params.id}:`, error);

    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({
        message: error.message,
      });
    }

    res.status(500).json({
      message: 'Error updating Helm release',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * @swagger
 * /api/v1/helm/{id}:
 *   delete:
 *     summary: Delete a Helm release
 *     description: Uninstall a Helm release and remove its metadata (Codesphere spec)
 *     tags: [Helm Releases]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Managed service ID
 *     responses:
 *       200:
 *         description: Helm release deleted successfully (empty body per Codesphere spec)
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Release not found
 *       500:
 *         description: Server error
 */
router.delete('/:id', async (req, res) => {
  try {
    const id = req.params.id;

    await helmManager.deleteRelease(id);

    // Return empty body (Codesphere spec)
    res.status(200).send();
  } catch (error) {
    console.error(`Error deleting Helm release ${req.params.id}:`, error);

    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({
        message: error.message,
      });
    }

    res.status(500).json({
      message: 'Error deleting Helm release',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Special handler for GET with ?id query parameters (getStatus)
router.get('/', async (req, res, next) => {
  const ids = req.query.id;

  // If no id parameter, let the list handler above handle it
  if (!ids) {
    return next();
  }

  try {
    const requestedIds = Array.isArray(ids) ? ids as string[] : [ids as string];

    // Codesphere spec: max 40 IDs
    if (requestedIds.length > 40) {
      return res.status(400).json({
        message: 'Maximum of 40 IDs allowed per request',
      });
    }

    const releases = await helmManager.listReleases(requestedIds);

    // Get detailed information for each release
    const detailedReleases = await Promise.all(
      releases.map(async (release) => {
        try {
          const details = await helmManager.getReleaseDetails(release.id);
          return [
            release.id,
            {
              plan: defaultPlan,
              config: {},  // Config is not returned in GET (Codesphere spec)
              details: {
                releaseName: release.releaseName,
                namespace: release.namespace,
                status: details.status.status,
                lastDeployed: details.status.lastDeployed,
                createdAt: release.createdAt,
                updatedAt: release.updatedAt,
                repoUrl: release.repoUrl,
                targetRevision: release.targetRevision,
                path: release.path,
              },
            },
          ];
        } catch (error) {
          // If we can't get details, return basic info
          return [
            release.id,
            {
              plan: defaultPlan,
              config: {},
              details: {
                releaseName: release.releaseName,
                namespace: release.namespace,
                status: 'unknown',
                createdAt: release.createdAt,
                updatedAt: release.updatedAt,
                repoUrl: release.repoUrl,
                targetRevision: release.targetRevision,
                path: release.path,
              },
            },
          ];
        }
      }),
    );

    const releasesObject = Object.fromEntries(detailedReleases);
    res.json(releasesObject);
  } catch (error) {
    console.error('Error fetching Helm release details:', error);
    res.status(500).json({
      message: 'Error fetching Helm release details',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
