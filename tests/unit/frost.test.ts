import { describe, expect, it } from "vitest";
import { frostObservationsResponseSchema } from "@/lib/weather/observations/frost/schema";
import { normalizeFrostResponse } from "@/lib/weather/observations/frost/normalize";
import fixture from "../fixtures/frost-observations-response.json";

describe("frostObservationsResponseSchema", () => {
  it("accepts a real captured Frost response (verified live against frost.met.no)", () => {
    expect(frostObservationsResponseSchema.safeParse(fixture).success).toBe(true);
  });

  it("tolerates an empty data array (a 404 'no data in window' maps to this)", () => {
    expect(frostObservationsResponseSchema.safeParse({ data: [] }).success).toBe(true);
  });

  it("rejects an observation missing a value", () => {
    const bad = structuredClone(fixture) as { data: Array<{ observations: Array<{ value?: number }> }> };
    delete bad.data[0]!.observations[0]!.value;
    expect(frostObservationsResponseSchema.safeParse(bad).success).toBe(false);
  });
});

describe("normalizeFrostResponse", () => {
  const parsed = frostObservationsResponseSchema.parse(fixture);
  const retrievedAt = new Date("2026-07-22T10:15:00Z");

  const observations = normalizeFrostResponse({
    stationId: "station-1",
    retrievedAt,
    response: parsed,
  });

  it("produces one row per referenceTime", () => {
    expect(observations).toHaveLength(fixture.data.length);
  });

  it("prefers the lowest qualityCode among duplicate elementId entries for the same timestamp", () => {
    const first = observations[0];
    // The 10:00 bundle has air_temperature reported at 10m/qualityCode 2
    // *and* 2m/qualityCode 0 - the clean 2m reading (20.7) must win.
    expect(first?.observedAt).toBe("2026-07-22T10:00:00.000Z");
    expect(first?.airTemperatureC).toBe(20.7);
  });

  it("sets qualityCode from the values actually used, not a discarded duplicate", () => {
    // The 10m/qualityCode-2 air_temperature duplicate loses to the
    // 2m/qualityCode-0 reading, so it never taints the row's summary.
    const first = observations[0];
    expect(first?.qualityCode).toBe("0");
  });

  it("carries station id, source provider, and retrieval time", () => {
    const first = observations[0];
    expect(first?.stationId).toBe("station-1");
    expect(first?.sourceProvider).toBe("frost");
    expect(first?.retrievedAt).toBe(retrievedAt.toISOString());
  });

  it("distinguishes a real zero reading from a timestamp with no reading at all", () => {
    // The hourly precipitation sum is only reported on the :00 mark - a
    // genuine measured 0mm there, versus undefined (not zero) for the other
    // nine per-minute entries where Frost simply didn't report it.
    expect(observations[0]?.observedAt).toBe("2026-07-22T10:00:00.000Z");
    expect(observations[0]?.precipitationAmountMm).toBe(0);

    for (const observation of observations.slice(1)) {
      expect(observation.precipitationAmountMm).toBeUndefined();
    }
  });
});
