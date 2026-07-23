import { describe, expect, it } from "vitest";
import { aggregateDailyForecast, pickCurrentConditions } from "@/lib/weather/forecast-view";
import type { StoredForecastPoint } from "@/db/forecasts";

function point(overrides: Partial<StoredForecastPoint> & { targetTime: string }): StoredForecastPoint {
  return {
    id: "point-id",
    forecastHorizonMinutes: 0,
    airTemperatureC: null,
    minTemperatureC: null,
    maxTemperatureC: null,
    apparentTemperatureC: null,
    precipitationAmountMm: null,
    precipitationProbabilityPct: null,
    windSpeedMps: null,
    windGustMps: null,
    windDirectionDeg: null,
    relativeHumidityPct: null,
    airPressureHpa: null,
    cloudAreaFractionPct: null,
    weatherSymbolCode: null,
    sourceWeatherCode: null,
    ...overrides,
  };
}

describe("pickCurrentConditions", () => {
  it("picks the point closest to now", () => {
    const now = new Date("2026-07-23T10:00:00Z");
    const points = [
      point({ id: "far-past", targetTime: "2026-07-23T02:00:00Z" }),
      point({ id: "closest", targetTime: "2026-07-23T09:45:00Z" }),
      point({ id: "far-future", targetTime: "2026-07-24T02:00:00Z" }),
    ];

    expect(pickCurrentConditions(points, now)?.id).toBe("closest");
  });

  it("returns undefined for an empty list", () => {
    expect(pickCurrentConditions([])).toBeUndefined();
  });
});

describe("aggregateDailyForecast", () => {
  it("groups points into Europe/Oslo calendar days and computes high/low/precipitation", () => {
    const points = [
      point({ targetTime: "2026-07-23T06:00:00Z", airTemperatureC: 10, precipitationAmountMm: 0.5 }),
      point({ targetTime: "2026-07-23T12:00:00Z", airTemperatureC: 18, precipitationAmountMm: 1.2 }),
      point({ targetTime: "2026-07-24T06:00:00Z", airTemperatureC: 8 }),
    ];

    const summary = aggregateDailyForecast(points, { now: new Date("2026-07-23T00:00:00Z"), days: 2 });

    expect(summary).toHaveLength(2);
    expect(summary[0]).toMatchObject({
      dateKey: "2026-07-23",
      minTemperatureC: 10,
      maxTemperatureC: 18,
      totalPrecipitationMm: 1.7,
    });
    expect(summary[1]).toMatchObject({
      dateKey: "2026-07-24",
      minTemperatureC: 8,
      maxTemperatureC: 8,
      totalPrecipitationMm: undefined,
    });
  });

  it("gives an empty summary, not zeros, for a day with no ingested points yet", () => {
    const summary = aggregateDailyForecast([], { now: new Date("2026-07-23T00:00:00Z"), days: 1 });

    expect(summary[0]).toMatchObject({
      dateKey: "2026-07-23",
      minTemperatureC: undefined,
      maxTemperatureC: undefined,
      totalPrecipitationMm: undefined,
      pointCount: 0,
    });
  });

  it("prefers the first point in the day that has a symbol code", () => {
    const points = [
      point({ targetTime: "2026-07-23T06:00:00Z", sourceWeatherCode: null }),
      point({ targetTime: "2026-07-23T09:00:00Z", sourceWeatherCode: "partlycloudy_day" }),
    ];

    const summary = aggregateDailyForecast(points, { now: new Date("2026-07-23T00:00:00Z"), days: 1 });
    expect(summary[0]?.representativeSymbolCode).toBe("partlycloudy_day");
  });
});
