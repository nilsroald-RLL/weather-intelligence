import { describe, expect, it } from "vitest";
import { metNorwayResponseSchema } from "@/lib/weather/providers/met-norway/schema";
import { normalizeMetNorwayResponse } from "@/lib/weather/providers/met-norway/normalize";
import fixture from "../fixtures/met-norway-complete-response.json";

describe("metNorwayResponseSchema", () => {
  it("accepts a real captured Locationforecast response (verified live against api.met.no)", () => {
    const result = metNorwayResponseSchema.safeParse(fixture);
    expect(result.success).toBe(true);
  });

  it("tolerates unknown extra fields without failing", () => {
    const withExtra = structuredClone(fixture) as Record<string, unknown>;
    (withExtra.properties as Record<string, unknown>).meta = {
      ...(withExtra.properties as { meta: object }).meta,
      some_future_field: "unexpected",
    };
    expect(metNorwayResponseSchema.safeParse(withExtra).success).toBe(true);
  });

  it("rejects a response with no timeseries entries", () => {
    const empty = structuredClone(fixture) as Record<string, unknown>;
    (empty.properties as Record<string, unknown>).timeseries = [];
    expect(metNorwayResponseSchema.safeParse(empty).success).toBe(false);
  });

  it("rejects a response missing the issue time", () => {
    const noMeta = structuredClone(fixture) as Record<string, unknown>;
    (noMeta.properties as Record<string, unknown>).meta = {};
    expect(metNorwayResponseSchema.safeParse(noMeta).success).toBe(false);
  });
});

describe("normalizeMetNorwayResponse", () => {
  const parsed = metNorwayResponseSchema.parse(fixture);
  const retrievedAt = new Date("2026-07-23T07:40:00Z");

  const forecast = normalizeMetNorwayResponse({
    locationId: "loc-1",
    providerId: "met-norway",
    retrievedAt,
    response: parsed,
    rawPayload: fixture,
  });

  it("computes horizon from the issue time, not the retrieval time", () => {
    // issued_at 07:33:42, target 08:00:00 -> ~26 minutes, not ~20 minutes
    // from retrievedAt.
    expect(forecast.points[0]?.forecastHorizonMinutes).toBe(26);
  });

  it("prefers next_1_hours for precipitation and symbol when present", () => {
    const first = forecast.points[0];
    expect(first?.precipitationAmountMm).toBe(0);
    expect(first?.sourceWeatherCode).toBe("clearsky_day");
  });

  it("falls back to next_6_hours for min/max temperature (next_1_hours never carries them)", () => {
    const first = forecast.points[0];
    expect(first?.minTemperatureC).toBe(17.7);
    expect(first?.maxTemperatureC).toBe(23.1);
  });

  it("falls back to next_6_hours when next_1_hours is absent", () => {
    const second = forecast.points[1];
    expect(second?.precipitationAmountMm).toBe(3);
    expect(second?.sourceWeatherCode).toBe("rain");
  });

  it("leaves precipitation and symbol undefined rather than zero when no lookahead window exists", () => {
    const last = forecast.points[2];
    expect(last?.precipitationAmountMm).toBeUndefined();
    expect(last?.sourceWeatherCode).toBeUndefined();
    expect(last?.minTemperatureC).toBeUndefined();
  });

  it("never fabricates an apparent temperature", () => {
    expect(forecast.points[0]?.apparentTemperatureC).toBeUndefined();
  });

  it("carries the instant details through unchanged", () => {
    const first = forecast.points[0];
    expect(first?.airTemperatureC).toBe(16);
    expect(first?.windSpeedMps).toBe(2.5);
    expect(first?.windGustMps).toBe(6.2);
    expect(first?.windDirectionDeg).toBe(32);
  });
});
