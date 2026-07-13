import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts"],
    // Dummy values so importing src/lib/env.ts (which validates process.env at
    // module load) doesn't crash test files that merely need something else
    // from the module. Test cases exercise parseEnv() directly with their own
    // inputs and aren't affected by these.
    env: {
      NEXT_PUBLIC_APP_NAME: "Weather Intelligence",
      APP_TIMEZONE: "Europe/Oslo",
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
      SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
      MET_USER_AGENT: "weather-intelligence/0.1 test@example.com",
      FROST_CLIENT_ID: "frost-client-id",
      STORM_PROVIDER_MODE: "disabled",
      CRON_SECRET: "cron-secret",
    },
  },
});
