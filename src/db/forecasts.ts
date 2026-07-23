import type { SupabaseClient } from "@supabase/supabase-js";
import type { NormalizedForecastPoint } from "@/types/weather";

export type ForecastRunStatus = "ok" | "fetch_error" | "invalid_response";

export async function insertRawPayload(
  client: SupabaseClient,
  params: { providerId: string; locationId: string; retrievedAt: Date; payload: unknown },
): Promise<string> {
  const { data, error } = await client
    .from("raw_forecast_payloads")
    .insert({
      provider_id: params.providerId,
      location_id: params.locationId,
      retrieved_at: params.retrievedAt.toISOString(),
      payload: params.payload,
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(`Failed to store raw forecast payload: ${error?.message ?? "no row returned"}`);
  }

  return data.id;
}

export async function insertForecastRun(
  client: SupabaseClient,
  params: {
    providerId: string;
    locationId: string;
    retrievedAt: Date;
    issuedAt: Date | null;
    rawPayloadId: string | null;
    responseStatus: ForecastRunStatus;
    parserVersion: string;
    errorMessage?: string;
  },
): Promise<string> {
  const { data, error } = await client
    .from("forecast_runs")
    .insert({
      provider_id: params.providerId,
      location_id: params.locationId,
      retrieved_at: params.retrievedAt.toISOString(),
      issued_at: params.issuedAt ? params.issuedAt.toISOString() : null,
      raw_payload_id: params.rawPayloadId,
      response_status: params.responseStatus,
      parser_version: params.parserVersion,
      error_message: params.errorMessage ?? null,
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(`Failed to record forecast run: ${error?.message ?? "no row returned"}`);
  }

  return data.id;
}

/**
 * Insert-only, on conflict (forecast_run_id, target_time) do nothing - the
 * database also has no update grant on this table (see the migration), so
 * this is never able to overwrite an existing snapshot even if called twice
 * for the same run.
 */
export async function insertForecastPoints(
  client: SupabaseClient,
  params: {
    forecastRunId: string;
    locationId: string;
    providerId: string;
    points: NormalizedForecastPoint[];
  },
): Promise<number> {
  if (params.points.length === 0) return 0;

  const rows = params.points.map((point) => ({
    forecast_run_id: params.forecastRunId,
    location_id: params.locationId,
    provider_id: params.providerId,
    target_time: point.targetTime,
    forecast_horizon_minutes: point.forecastHorizonMinutes,
    air_temperature_c: point.airTemperatureC ?? null,
    min_temperature_c: point.minTemperatureC ?? null,
    max_temperature_c: point.maxTemperatureC ?? null,
    apparent_temperature_c: point.apparentTemperatureC ?? null,
    precipitation_amount_mm: point.precipitationAmountMm ?? null,
    precipitation_probability_pct: point.precipitationProbabilityPct ?? null,
    wind_speed_mps: point.windSpeedMps ?? null,
    wind_gust_mps: point.windGustMps ?? null,
    wind_direction_deg: point.windDirectionDeg ?? null,
    relative_humidity_pct: point.relativeHumidityPct ?? null,
    air_pressure_hpa: point.airPressureHpa ?? null,
    cloud_area_fraction_pct: point.cloudAreaFractionPct ?? null,
    weather_symbol_code: point.weatherSymbolCode ?? null,
    source_weather_code: point.sourceWeatherCode ?? null,
  }));

  const { data, error } = await client
    .from("forecast_points")
    .upsert(rows, { onConflict: "forecast_run_id,target_time", ignoreDuplicates: true })
    .select("id");

  if (error) {
    throw new Error(`Failed to insert forecast points: ${error.message}`);
  }

  return data?.length ?? 0;
}

export type LatestForecastRun = {
  id: string;
  retrievedAt: string;
  issuedAt: string | null;
};

export async function getLatestForecastRun(
  client: SupabaseClient,
  params: { locationId: string; providerId: string },
): Promise<LatestForecastRun | null> {
  const { data, error } = await client
    .from("forecast_runs")
    .select("id, retrieved_at, issued_at")
    .eq("location_id", params.locationId)
    .eq("provider_id", params.providerId)
    .eq("response_status", "ok")
    .order("retrieved_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load the latest forecast run: ${error.message}`);
  }

  if (!data) return null;

  return { id: data.id, retrievedAt: data.retrieved_at, issuedAt: data.issued_at };
}

/**
 * A point as read back from storage. Deliberately not NormalizedForecastPoint:
 * issuedAt/retrievedAt live once on forecast_runs, not duplicated onto every
 * point row, so a stored point's shape is genuinely different from what
 * normalization produces before insertion.
 */
export type StoredForecastPoint = {
  id: string;
  targetTime: string;
  forecastHorizonMinutes: number;
  airTemperatureC: number | null;
  minTemperatureC: number | null;
  maxTemperatureC: number | null;
  apparentTemperatureC: number | null;
  precipitationAmountMm: number | null;
  precipitationProbabilityPct: number | null;
  windSpeedMps: number | null;
  windGustMps: number | null;
  windDirectionDeg: number | null;
  relativeHumidityPct: number | null;
  airPressureHpa: number | null;
  cloudAreaFractionPct: number | null;
  weatherSymbolCode: string | null;
  sourceWeatherCode: string | null;
};

type ForecastPointRow = {
  id: string;
  target_time: string;
  forecast_horizon_minutes: number;
  air_temperature_c: number | null;
  min_temperature_c: number | null;
  max_temperature_c: number | null;
  apparent_temperature_c: number | null;
  precipitation_amount_mm: number | null;
  precipitation_probability_pct: number | null;
  wind_speed_mps: number | null;
  wind_gust_mps: number | null;
  wind_direction_deg: number | null;
  relative_humidity_pct: number | null;
  air_pressure_hpa: number | null;
  cloud_area_fraction_pct: number | null;
  weather_symbol_code: string | null;
  source_weather_code: string | null;
};

function toStoredForecastPoint(row: ForecastPointRow): StoredForecastPoint {
  return {
    id: row.id,
    targetTime: row.target_time,
    forecastHorizonMinutes: row.forecast_horizon_minutes,
    airTemperatureC: row.air_temperature_c,
    minTemperatureC: row.min_temperature_c,
    maxTemperatureC: row.max_temperature_c,
    apparentTemperatureC: row.apparent_temperature_c,
    precipitationAmountMm: row.precipitation_amount_mm,
    precipitationProbabilityPct: row.precipitation_probability_pct,
    windSpeedMps: row.wind_speed_mps,
    windGustMps: row.wind_gust_mps,
    windDirectionDeg: row.wind_direction_deg,
    relativeHumidityPct: row.relative_humidity_pct,
    airPressureHpa: row.air_pressure_hpa,
    cloudAreaFractionPct: row.cloud_area_fraction_pct,
    weatherSymbolCode: row.weather_symbol_code,
    sourceWeatherCode: row.source_weather_code,
  };
}

export async function getForecastPointsForRun(
  client: SupabaseClient,
  forecastRunId: string,
): Promise<StoredForecastPoint[]> {
  // A plain string literal, not a concatenated one - supabase-js infers the
  // row type from the literal select string, and falls back to an
  // unusable error type once the string isn't a single literal.
  const { data, error } = await client
    .from("forecast_points")
    .select(
      "id, target_time, forecast_horizon_minutes, air_temperature_c, min_temperature_c, max_temperature_c, apparent_temperature_c, precipitation_amount_mm, precipitation_probability_pct, wind_speed_mps, wind_gust_mps, wind_direction_deg, relative_humidity_pct, air_pressure_hpa, cloud_area_fraction_pct, weather_symbol_code, source_weather_code",
    )
    .eq("forecast_run_id", forecastRunId)
    .order("target_time", { ascending: true });

  if (error) {
    throw new Error(`Failed to load forecast points: ${error.message}`);
  }

  return (data ?? []).map(toStoredForecastPoint);
}
