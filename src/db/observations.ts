import type { SupabaseClient } from "@supabase/supabase-js";
import type { NormalizedObservation } from "@/types/weather";

/**
 * Insert-only, on conflict (station_id, observed_at) do nothing - same
 * immutability discipline as forecast_points. The database also has no
 * update/delete grant on this table (see the migration), so this can't
 * overwrite an existing observation even if called twice for an
 * overlapping time window, which the hourly job's rolling window does on
 * purpose (to catch delayed reports).
 */
export async function insertObservations(
  client: SupabaseClient,
  params: { stationId: string; observations: NormalizedObservation[] },
): Promise<number> {
  if (params.observations.length === 0) return 0;

  const rows = params.observations.map((observation) => ({
    station_id: params.stationId,
    observed_at: observation.observedAt,
    air_temperature_c: observation.airTemperatureC ?? null,
    precipitation_amount_mm: observation.precipitationAmountMm ?? null,
    wind_speed_mps: observation.windSpeedMps ?? null,
    wind_gust_mps: observation.windGustMps ?? null,
    wind_direction_deg: observation.windDirectionDeg ?? null,
    relative_humidity_pct: observation.relativeHumidityPct ?? null,
    air_pressure_hpa: observation.airPressureHpa ?? null,
    quality_code: observation.qualityCode ?? null,
    source_provider: observation.sourceProvider,
    retrieved_at: observation.retrievedAt,
  }));

  const { data, error } = await client
    .from("observations")
    .upsert(rows, { onConflict: "station_id,observed_at", ignoreDuplicates: true })
    .select("id");

  if (error) {
    throw new Error(`Failed to insert observations: ${error.message}`);
  }

  return data?.length ?? 0;
}

export type LatestObservation = {
  observedAt: string;
  airTemperatureC: number | null;
  precipitationAmountMm: number | null;
  windSpeedMps: number | null;
  windDirectionDeg: number | null;
};

export async function getLatestObservationForStation(
  client: SupabaseClient,
  stationId: string,
): Promise<LatestObservation | null> {
  const { data, error } = await client
    .from("observations")
    .select("observed_at, air_temperature_c, precipitation_amount_mm, wind_speed_mps, wind_direction_deg")
    .eq("station_id", stationId)
    .order("observed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load the latest observation: ${error.message}`);
  }

  if (!data) return null;

  return {
    observedAt: data.observed_at,
    airTemperatureC: data.air_temperature_c,
    precipitationAmountMm: data.precipitation_amount_mm,
    windSpeedMps: data.wind_speed_mps,
    windDirectionDeg: data.wind_direction_deg,
  };
}
