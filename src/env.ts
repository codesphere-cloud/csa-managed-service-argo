import { z } from "zod/v4";
import { globalConfigSchema } from "./types/config";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(3000),
  API_TOKEN: z.string(),

  // Global configuration
  GLOBAL_MODE: z.enum(["custom_cluster", "shared_cluster"]).default("shared_cluster"),
  GLOBAL_KUBECONFIG: z.string().optional(),
  GLOBAL_NAMESPACE_PATTERN: z.string().optional(),
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
  mode: env.GLOBAL_MODE,
  kubeConfig: env.GLOBAL_KUBECONFIG,
  namespacePattern: env.GLOBAL_NAMESPACE_PATTERN,
});
