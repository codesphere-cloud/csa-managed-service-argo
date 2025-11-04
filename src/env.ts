import { z } from "zod/v4";

import { globalConfigSchema } from "./types/config.js";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(3000),
  API_TOKEN: z.string(),
  NAMESPACE_PATTERN: z.string().default("managed-{id}"),
  KUBECONFIG_PROVIDER_ENDPOINT: z.string().optional(),
  FALLBACK_KUBECONFIG: z.string().optional(),
});

try {
  // eslint-disable-next-line node/no-process-env
  envSchema.parse(process.env);
}
catch (error) {
  if (error instanceof z.ZodError) {
    console.error("Missing environment variables:", error.issues.flatMap(issue => issue.path));
  }
  else {
    console.error(error);
  }
  process.exit(1);
}

// eslint-disable-next-line node/no-process-env
export const env = envSchema.parse(process.env);

// Build global configuration from environment variables
export const globalConfig = globalConfigSchema.parse({
  namespacePattern: env.NAMESPACE_PATTERN,
  kubeconfigProviderEndpoint: env.KUBECONFIG_PROVIDER_ENDPOINT,
  fallbackKubeconfig: env.FALLBACK_KUBECONFIG,
});
