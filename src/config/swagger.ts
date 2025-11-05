import swaggerJsdoc from "swagger-jsdoc";

import { env } from "../env.js";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Helm Managed Service Provider API",
      version: "1.0.0",
      description: "A microservice for deploying and managing custom Helm charts across Kubernetes clusters",
      contact: {
        name: "API Support",
      },
    },
    servers: [
      {
        url: `http://localhost:${env.PORT}`,
        description: "Development server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "Enter your API token",
        },
      },
      schemas: {
        InstanceConfig: {
          type: "object",
          required: ["repoUrl", "targetRevision", "path"],
          properties: {
            repoUrl: {
              type: "string",
              format: "uri",
              description: "Git repository URL containing the Helm chart",
              example: "https://github.com/example/helm-charts.git",
            },
            targetRevision: {
              type: "string",
              description: "Branch, tag, or commit SHA",
              example: "main",
            },
            path: {
              type: "string",
              description: "Path to Helm chart in repository",
              example: "charts/webapp",
            },
            kubeConfig: {
              type: "string",
              description: "Path to kubeconfig (custom_cluster mode only)",
              example: "/path/to/kubeconfig",
            },
            namespace: {
              type: "string",
              description: "Target namespace (custom_cluster mode only)",
              example: "production",
            },
            helmValues: {
              type: "object",
              description: "Helm values to override",
              example: {
                replicaCount: 2,
                image: {
                  tag: "v1.0.0",
                },
              },
            },
          },
        },
        CreateReleaseRequest: {
          type: "object",
          required: ["id", "instanceConfig"],
          properties: {
            id: {
              type: "string",
              description: "Unique instance ID",
              example: "my-app-instance",
            },
            teamId: {
              type: "string",
              description: "Team ID (required for shared_cluster mode)",
              example: "engineering",
            },
            appName: {
              type: "string",
              description: "App name (required for shared_cluster mode)",
              example: "frontend",
            },
            instanceConfig: {
              $ref: "#/components/schemas/InstanceConfig",
            },
          },
        },
        UpdateReleaseRequest: {
          type: "object",
          properties: {
            instanceConfig: {
              type: "object",
              description: "Partial instance configuration to update",
              properties: {
                targetRevision: {
                  type: "string",
                  example: "v2.0.0",
                },
                helmValues: {
                  type: "object",
                  example: {
                    replicaCount: 3,
                  },
                },
              },
            },
          },
        },
        ReleaseResponse: {
          type: "object",
          properties: {
            plan: {
              type: "object",
              description: "Plan information (Codesphere managed service provider spec)",
              properties: {
                id: {
                  type: "integer",
                  example: 0,
                },
                parameters: {
                  type: "object",
                  example: {},
                },
              },
            },
            config: {
              type: "object",
              description: "Configuration (reserved for future use)",
              example: {},
            },
            details: {
              type: "object",
              properties: {
                releaseName: {
                  type: "string",
                  example: "managed-my-app-instance",
                },
                namespace: {
                  type: "string",
                  example: "team-engineering-frontend",
                },
                status: {
                  type: "string",
                  example: "deployed",
                },
                lastDeployed: {
                  type: "string",
                  format: "date-time",
                  example: "2025-11-03T10:00:00Z",
                },
                createdAt: {
                  type: "string",
                  format: "date-time",
                  example: "2025-11-01T10:00:00Z",
                },
                updatedAt: {
                  type: "string",
                  format: "date-time",
                  example: "2025-11-03T10:00:00Z",
                },
                repoUrl: {
                  type: "string",
                  example: "https://github.com/example/charts.git",
                },
                targetRevision: {
                  type: "string",
                  example: "main",
                },
                path: {
                  type: "string",
                  example: "charts/webapp",
                },
              },
            },
          },
        },
        Error: {
          type: "object",
          properties: {
            message: {
              type: "string",
              example: "Error message",
            },
            error: {
              type: "string",
              example: "Detailed error description",
            },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ["./src/api/*.ts"], // Path to the API routes
};

export const swaggerSpec = swaggerJsdoc(options);
