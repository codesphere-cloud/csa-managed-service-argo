import express from "express";

import type MessageResponse from "../interfaces/message-response.js";

import argo from "./argo";

const router = express.Router();

// Step 1: Define your pre-shared secret token
// It's best practice to use an environment variable for this.
const PRE_SHARED_TOKEN = process.env.API_TOKEN;

router.get<object, MessageResponse>("/", (req, res) => {
  res.json({
    message: "API - 👋🌎🌍🌏",
  });
});



// Step 2: Create the middleware function
function authenticateToken(req, res, next) {
    // Get the Authorization header from the request
    const authHeader = req.headers['authorization'];
    // The header format is "Bearer TOKEN", so split it to get the token
    const token = authHeader && authHeader.split(' ')[1];

    // Check if the token is missing
    if (token == null) {
        return res.status(401).send('Access denied. Token is required.');
    }

    // Compare the received token with your pre-shared secret token
    if (token === PRE_SHARED_TOKEN) {
        // Token is valid, proceed to the next middleware/route handler
        next();
    } else {
        // Token is invalid, deny access
        res.status(403).send('Forbidden');
    }
}

router.use("/argo", authenticateToken, argo);

export default router;
