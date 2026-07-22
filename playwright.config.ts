import { defineConfig, devices } from "@playwright/test";

const BASE_URL = "http://127.0.0.1:3000";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  reporter: "list",
  use: {
    baseURL: BASE_URL,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    // -H 127.0.0.1 keeps the dev server off all-interfaces binding, which
    // would otherwise trigger a Windows Firewall prompt (see README).
    command: "npm run dev",
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      // Placeholder values so the environment schema in src/lib/env.ts
      // validates and the server can boot without real provider credentials.
      NEXT_PUBLIC_APP_NAME: "Weather Intelligence",
      APP_TIMEZONE: "Europe/Oslo",
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
      SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
      APPROVED_LOGIN_EMAILS: "test@example.com",
      MET_USER_AGENT: "weather-intelligence/0.1 test@example.com",
      FROST_CLIENT_ID: "frost-client-id",
      STORM_PROVIDER_MODE: "disabled",
      CRON_SECRET: "cron-secret",
    },
  },
});
