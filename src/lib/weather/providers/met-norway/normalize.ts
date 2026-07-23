import type { NormalizedForecast, NormalizedForecastPoint } from "@/types/weather";
import type { MetNorwayPeriod, MetNorwayResponse } from "./schema";

export const PARSER_VERSION = "met-norway-v1";

/**
 * Returns the first defined value across the given lookahead windows, tried
 * nearest-term first. Windows coexist rather than replace each other (an
 * hourly point commonly has next_1_hours, next_6_hours, and next_12_hours
 * all at once, describing different-length lookaheads from that instant),
 * and which fields each one carries varies - this is what "prefer the
 * nearest window that actually has the field" comes down to.
 */
function firstDefined<T>(
  periods: Array<MetNorwayPeriod | undefined>,
  pick: (period: MetNorwayPeriod) => T | undefined,
): T | undefined {
  for (const period of periods) {
    if (!period) continue;
    const value = pick(period);
    if (value !== undefined) return value;
  }
  return undefined;
}

function minutesBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / 60_000);
}

export function normalizeMetNorwayResponse(params: {
  locationId: string;
  providerId: string;
  retrievedAt: Date;
  response: MetNorwayResponse;
  rawPayload: unknown;
}): NormalizedForecast {
  const { locationId, providerId, retrievedAt, response, rawPayload } = params;

  const parsedIssuedAt = new Date(response.properties.meta.updated_at);
  const issuedAtDate = Number.isNaN(parsedIssuedAt.getTime()) ? null : parsedIssuedAt;
  // Horizon prefers issuance time over retrieval time (docs/architecture.md
  // section 7) - retrieving a forecast doesn't change how far out it was
  // actually made.
  const horizonBase = issuedAtDate ?? retrievedAt;

  const points: NormalizedForecastPoint[] = response.properties.timeseries.map((entry) => {
    const targetTime = new Date(entry.time);
    const instant = entry.data.instant.details;
    const periods = [entry.data.next_1_hours, entry.data.next_6_hours, entry.data.next_12_hours];

    return {
      locationId,
      providerId,
      issuedAt: issuedAtDate ? issuedAtDate.toISOString() : null,
      retrievedAt: retrievedAt.toISOString(),
      targetTime: targetTime.toISOString(),
      forecastHorizonMinutes: minutesBetween(horizonBase, targetTime),
      airTemperatureC: instant.air_temperature,
      minTemperatureC: firstDefined(periods, (p) => p.details?.air_temperature_min),
      maxTemperatureC: firstDefined(periods, (p) => p.details?.air_temperature_max),
      // MET Locationforecast has no apparent/"feels like" field - left
      // undefined rather than computed, since a wind-chill/heat-index
      // formula would be a derived estimate this codebase hasn't validated.
      apparentTemperatureC: undefined,
      precipitationAmountMm: firstDefined(periods, (p) => p.details?.precipitation_amount),
      precipitationProbabilityPct: firstDefined(
        periods,
        (p) => p.details?.probability_of_precipitation,
      ),
      windSpeedMps: instant.wind_speed,
      windGustMps: instant.wind_speed_of_gust,
      windDirectionDeg: instant.wind_from_direction,
      relativeHumidityPct: instant.relative_humidity,
      airPressureHpa: instant.air_pressure_at_sea_level,
      cloudAreaFractionPct: instant.cloud_area_fraction,
      // weatherSymbolCode is reserved for the normalised-category mapping
      // (docs/backlog.md Phase 2, "Weather-code mapping to normalised
      // categories") - not built yet, so left undefined rather than
      // duplicating the raw code under a name that implies it's been mapped.
      weatherSymbolCode: undefined,
      sourceWeatherCode: firstDefined(periods, (p) => p.summary?.symbol_code),
      parserVersion: PARSER_VERSION,
    };
  });

  return {
    locationId,
    providerId,
    issuedAt: issuedAtDate ? issuedAtDate.toISOString() : null,
    retrievedAt: retrievedAt.toISOString(),
    points,
    rawPayload,
  };
}
