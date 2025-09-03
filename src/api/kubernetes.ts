import express from "express";
import * as k8s from '@kubernetes/client-node';

const router = express.Router();

const kc = new k8s.KubeConfig();
kc.loadFromDefault();

const k8sApi = kc.makeApiClient(k8s.CoreV1Api);

router.get("/", async (req, res) => {
  try {
    const namespace = 'default';
    const response = await k8sApi.listNamespacedPod({ namespace });
	const podNames = response.body?.items?.map(pod => pod.metadata.name) || [];
    res.json(podNames);
  } catch (err) {
    console.error("Error fetching pods:", err);
    res.status(500).send("Error fetching pods");
  }
});

export default router;