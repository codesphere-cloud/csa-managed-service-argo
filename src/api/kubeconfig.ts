import express from 'express';
import { kubeconfigProvider } from '../services/kubeconfig-provider';

const router = express.Router();

/**
 * Internal dummy kubeconfig provider endpoint
 * Returns the fallback kubeconfig for shared cluster mode
 *
 * GET /api/v1/kubeconfig/:managedServiceId
 */
router.get('/:managedServiceId', async (req, res) => {
  try {
    const { managedServiceId } = req.params;

    const result = await kubeconfigProvider.getKubeconfig(managedServiceId);

    res.json({
      kubeconfig: result.kubeconfig,
      namespace: result.namespace,
    });
  } catch (error) {
    console.error('Error providing kubeconfig:', error);
    res.status(500).json({
      message: 'Error providing kubeconfig',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
