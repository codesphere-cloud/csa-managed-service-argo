import { z } from "zod";

// Global configuration schema
export const globalConfigSchema = z.object({
  namespacePattern: z.string(),
  kubeconfigProviderEndpoint: z.string().optional(),
  fallbackKubeconfig: z.string().optional(),
});

export const planSchema = z.object({
  id: z.number(),
});

export const configSchema = z.object({
  repoUrl: z.string().url(),
  targetRevision: z.string(),
  path: z.string(),
  // Non-sensitive Helm values - can be object or stringified object
  helmValues: z.union([
    z.record(z.any()),
    z.string().transform((val) => {
      try {
        return JSON.parse(val);
      }
      catch {
        return {};
      }
    }),
  ]).optional().default({}),
});

export const secretsSchema = z.object({
  // Sensitive Helm values can go here - can be object or stringified object
  sensitiveHelmValues: z.union([
    z.record(z.any()),
    z.string().transform((val) => {
      try {
        return JSON.parse(val);
      }
      catch {
        return {};
      }
    }),
  ]).optional().default({}),
}).optional();

export const createManagedServiceRequestSchema = z.object({
  id: z.string().uuid(),
  plan: planSchema,
  config: configSchema,
  secrets: secretsSchema,
});

export const updateManagedServiceRequestSchema = z.object({
  config: configSchema.partial().optional(),
  secrets: secretsSchema,
});

// Types
export type GlobalConfig = z.infer<typeof globalConfigSchema>;
export type Plan = z.infer<typeof planSchema>;
export type Config = z.infer<typeof configSchema>;
export type Secrets = z.infer<typeof secretsSchema>;
export type CreateManagedServiceRequest = z.infer<typeof createManagedServiceRequestSchema>;
export type UpdateManagedServiceRequest = z.infer<typeof updateManagedServiceRequestSchema>;

// Helm release metadata stored in Kubernetes
export type HelmReleaseMetadata = {
  id: string;
  releaseName: string;
  namespace: string;
  repoUrl: string;
  targetRevision: string;
  path: string;
  createdAt: string;
  updatedAt: string;
};
