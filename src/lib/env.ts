import { z } from "zod";

const envSchema = z
  .object({
    NEXT_PUBLIC_APP_NAME: z.string().min(1),
    APP_TIMEZONE: z.string().min(1),

    NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

    MET_USER_AGENT: z.string().min(1),
    FROST_CLIENT_ID: z.string().min(1),

    STORM_PROVIDER_MODE: z.enum(["disabled", "mock", "api"]).default("disabled"),
    STORM_API_BASE_URL: z.string().url().optional(),
    STORM_API_KEY: z.string().min(1).optional(),

    CRON_SECRET: z.string().min(1),
  })
  .superRefine((value, ctx) => {
    if (value.STORM_PROVIDER_MODE !== "api") return;

    if (!value.STORM_API_BASE_URL) {
      ctx.addIssue({
        code: "custom",
        path: ["STORM_API_BASE_URL"],
        message: "Required when STORM_PROVIDER_MODE=api",
      });
    }
    if (!value.STORM_API_KEY) {
      ctx.addIssue({
        code: "custom",
        path: ["STORM_API_KEY"],
        message: "Required when STORM_PROVIDER_MODE=api",
      });
    }
  });

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(
      `Invalid environment configuration. Check .env.local against .env.example.\n${issues}`,
    );
  }

  return parsed.data;
}

// Validated once, at import time. `instrumentation.ts` imports this module so
// the check runs at server startup rather than lazily on the first request.
export const env = loadEnv();
