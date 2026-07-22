import { describe, expect, it } from "vitest";
import { parseEnv } from "@/lib/env";

const validEnv = {
  NEXT_PUBLIC_APP_NAME: "Weather Intelligence",
  APP_TIMEZONE: "Europe/Oslo",
  NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
  SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
  APPROVED_LOGIN_EMAILS: "Nils@Example.com, family@example.com",
  MET_USER_AGENT: "weather-intelligence/0.1 test@example.com",
  FROST_CLIENT_ID: "frost-client-id",
  STORM_PROVIDER_MODE: "disabled",
  CRON_SECRET: "cron-secret",
};

describe("parseEnv", () => {
  it("accepts a fully configured Yr-only environment", () => {
    const env = parseEnv(validEnv);
    expect(env.STORM_PROVIDER_MODE).toBe("disabled");
  });

  it("rejects a missing required variable", () => {
    const rest: Record<string, string | undefined> = { ...validEnv };
    delete rest.CRON_SECRET;
    expect(() => parseEnv(rest)).toThrow(/CRON_SECRET/);
  });

  it("requires Storm API fields when STORM_PROVIDER_MODE is api", () => {
    expect(() =>
      parseEnv({ ...validEnv, STORM_PROVIDER_MODE: "api" }),
    ).toThrow(/STORM_API_BASE_URL/);
  });

  it("splits and normalises the approved-login-emails list", () => {
    const env = parseEnv(validEnv);
    expect(env.APPROVED_LOGIN_EMAILS).toEqual(["nils@example.com", "family@example.com"]);
  });

  it("rejects an approved-login-emails entry that isn't a valid email", () => {
    expect(() =>
      parseEnv({ ...validEnv, APPROVED_LOGIN_EMAILS: "not-an-email" }),
    ).toThrow(/APPROVED_LOGIN_EMAILS/);
  });

  it("rejects a missing approved-login-emails variable", () => {
    const rest: Record<string, string | undefined> = { ...validEnv };
    delete rest.APPROVED_LOGIN_EMAILS;
    expect(() => parseEnv(rest)).toThrow(/APPROVED_LOGIN_EMAILS/);
  });
});
