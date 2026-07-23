import type { NormalizedObservation } from "@/types/weather";
import type { FrostObservation, FrostObservationsResponse } from "./schema";

export const PARSER_VERSION = "frost-v1";

type NumericObservationField =
  | "airTemperatureC"
  | "relativeHumidityPct"
  | "windSpeedMps"
  | "windDirectionDeg"
  | "windGustMps"
  | "airPressureHpa"
  | "precipitationAmountMm";

const ELEMENT_FIELD_MAP: Record<string, NumericObservationField> = {
  air_temperature: "airTemperatureC",
  relative_humidity: "relativeHumidityPct",
  wind_speed: "windSpeedMps",
  wind_from_direction: "windDirectionDeg",
  "max(wind_speed_of_gust PT1H)": "windGustMps",
  air_pressure_at_sea_level: "airPressureHpa",
  "sum(precipitation_amount PT1H)": "precipitationAmountMm",
};

/**
 * Frost can report the same elementId more than once within one
 * referenceTime bundle - a different sensor height, or an overlapping
 * supplementary series (verified live: Blindern reports air_temperature at
 * both 2m, quality-flagged clean, and 10m, flagged with a quality concern,
 * for the same minute). Preferring the lowest qualityCode is a general,
 * station-agnostic tiebreak rather than hardcoding a specific sensor height
 * per element, which would be Blindern-specific and might not hold at
 * Storåsen or E6 Fåberg.
 */
function pickBest(observations: FrostObservation[]): FrostObservation {
  return observations.reduce((best, candidate) => {
    const bestQuality = best.qualityCode ?? 0;
    const candidateQuality = candidate.qualityCode ?? 0;
    return candidateQuality < bestQuality ? candidate : best;
  });
}

/**
 * Groups Frost's flat per-element observations into one row per
 * referenceTime, matching the observations table (one row per station per
 * timestamp). An element Frost didn't report for a given timestamp is left
 * undefined on the result, never defaulted to zero.
 */
export function normalizeFrostResponse(params: {
  stationId: string;
  retrievedAt: Date;
  response: FrostObservationsResponse;
}): NormalizedObservation[] {
  const { stationId, retrievedAt, response } = params;

  return response.data.map((entry) => {
    const byElement = new Map<string, FrostObservation[]>();
    for (const observation of entry.observations) {
      const bucket = byElement.get(observation.elementId);
      if (bucket) {
        bucket.push(observation);
      } else {
        byElement.set(observation.elementId, [observation]);
      }
    }

    const result: NormalizedObservation = {
      stationId,
      observedAt: new Date(entry.referenceTime).toISOString(),
      sourceProvider: "frost",
      retrievedAt: retrievedAt.toISOString(),
    };

    // The row's overall quality code is the worst (highest) seen across its
    // merged fields - a conservative summary distinct from pickBest's
    // per-element "lowest wins" tiebreak among duplicates of one field.
    let worstQualityCode: number | undefined;

    for (const [elementId, candidates] of byElement) {
      const field = ELEMENT_FIELD_MAP[elementId];
      if (!field) continue;

      const best = pickBest(candidates);
      result[field] = best.value;

      if (best.qualityCode !== undefined) {
        worstQualityCode =
          worstQualityCode === undefined ? best.qualityCode : Math.max(worstQualityCode, best.qualityCode);
      }
    }

    if (worstQualityCode !== undefined) {
      result.qualityCode = String(worstQualityCode);
    }

    return result;
  });
}
