import type { Location } from "@/types/location";

// docs/product-spec.md section 8. Provider-specific parsing never produces
// anything but this shape - keeps provider quirks out of the UI and the
// evaluation code (ADR-003).
export type NormalizedForecastPoint = {
  locationId: string;
  providerId: string;
  issuedAt: string | null;
  retrievedAt: string;
  targetTime: string;
  forecastHorizonMinutes: number;
  airTemperatureC?: number;
  minTemperatureC?: number;
  maxTemperatureC?: number;
  apparentTemperatureC?: number;
  precipitationAmountMm?: number;
  precipitationProbabilityPct?: number;
  windSpeedMps?: number;
  windGustMps?: number;
  windDirectionDeg?: number;
  relativeHumidityPct?: number;
  airPressureHpa?: number;
  cloudAreaFractionPct?: number;
  weatherSymbolCode?: string;
  sourceWeatherCode?: string;
  rawPayloadId?: string;
  parserVersion: string;
};

/**
 * What a single provider fetch returns: one run's worth of target-time
 * points, plus the raw payload to store alongside them. Not itself named in
 * product-spec.md, but composes the NormalizedForecastPoint it documents -
 * a fetch always covers many target times issued at once.
 */
export type NormalizedForecast = {
  locationId: string;
  providerId: string;
  issuedAt: string | null;
  retrievedAt: string;
  points: NormalizedForecastPoint[];
  rawPayload: unknown;
};

// docs/product-spec.md section 8. locationId is optional here even though
// the spec shows it as required: an observation is intrinsically a property
// of a station, not a location (a station could in principle serve more
// than one location), which is also why the observations table has no
// location_id column - only station_id. Left undefined during normalization
// and only meaningful if a caller happens to know which location's mapping
// triggered a given fetch.
export type NormalizedObservation = {
  locationId?: string;
  stationId: string;
  observedAt: string;
  airTemperatureC?: number;
  precipitationAmountMm?: number;
  windSpeedMps?: number;
  windGustMps?: number;
  windDirectionDeg?: number;
  relativeHumidityPct?: number;
  airPressureHpa?: number;
  qualityCode?: string;
  sourceProvider: string;
  retrievedAt: string;
};

export type ProviderHealth = {
  providerId: string;
  status: "healthy" | "degraded" | "down";
  message?: string;
  checkedAt: string;
};

// docs/product-spec.md section 4.2
export interface ForecastProvider {
  providerId: string;
  fetchForecast(location: Location): Promise<NormalizedForecast>;
  healthCheck(): Promise<ProviderHealth>;
}
