import type { SupabaseClient } from "@supabase/supabase-js";

export type WeatherStationRow = {
  id: string;
  sourceStationId: string;
  name: string;
  latitude: number;
  longitude: number;
  elevationM: number | null;
};

export async function getStationBySourceId(
  client: SupabaseClient,
  sourceStationId: string,
): Promise<WeatherStationRow> {
  const { data, error } = await client
    .from("weather_stations")
    .select("id, source_station_id, name, latitude, longitude, elevation_m")
    .eq("source_station_id", sourceStationId)
    .single();

  if (error || !data) {
    throw new Error(
      `Weather station "${sourceStationId}" not found: ${error?.message ?? "no matching row"}`,
    );
  }

  return {
    id: data.id,
    sourceStationId: data.source_station_id,
    name: data.name,
    latitude: data.latitude,
    longitude: data.longitude,
    elevationM: data.elevation_m,
  };
}
