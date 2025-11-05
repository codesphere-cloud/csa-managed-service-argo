import express from "express";

import type MessageResponse from "../interfaces/message-response.js";

import { env } from "../env.js";
import helm from "./helm.js";
import kubeconfig from "./kubeconfig.js";

const router = express.Router();

router.get<object, MessageResponse>("/", (req, res) => {
  res.json({
    message: "Helm Managed Service Provider API",
  });
});

// Authentication middleware
function authenticateToken(req: express.Request, res: express.Response, next: express.NextFunction) {
  // Skip authentication in development mode
  if (env.NODE_ENV === "development") {
    console.warn("⚠️  Authentication disabled in development mode");
    return next();
  }

  // Get the Authorization header from the request
  const authHeader = req.headers.authorization;
  // The header format is "Bearer TOKEN", so split it to get the token
  const token = authHeader && authHeader.split(" ")[1];

  // Check if the token is missing
  if (token == null) {
    return res.status(401).send("Access denied. Token is required.");
  }

  // Compare the received token with the API token from environment
  if (token === env.API_TOKEN) {
    // Token is valid, proceed to the next middleware/route handler
    next();
  }
  else {
    // Token is invalid, deny access
    res.status(403).send("Forbidden");
  }
}

router.use("/helm", authenticateToken, helm);
router.use("/kubeconfig", authenticateToken, kubeconfig);

export default router;
