import type { SupabaseClient } from "@supabase/supabase-js";

export type LocationStationMapping = {
  variable: string;
  priority: number;
  distanceKm: number;
  elevationDifferenceM: number;
  selectionReason: string;
  manuallySelected: boolean;
  station: {
    id: string;
    sourceStationId: string;
    name: string;
  };
};

type MappingRow = {
  variable: string;
  priority: number;
  distance_km: number;
  elevation_difference_m: number;
  selection_reason: string;
  manually_selected: boolean;
  weather_stations: {
    id: string;
    source_station_id: string;
    name: string;
  };
};

export async function getActiveMappingsForLocation(
  client: SupabaseClient,
  locationId: string,
): Promise<LocationStationMapping[]> {
  const { data, error } = await client
    .from("location_station_mappings")
    .select(
      "variable, priority, distance_km, elevation_difference_m, selection_reason, manually_selected, weather_stations(id, source_station_id, name)",
    )
    .eq("location_id", locationId)
    .eq("active", true)
    .order("variable")
    .order("priority");

  if (error) {
    throw new Error(`Failed to load station mappings: ${error.message}`);
  }

  return ((data ?? []) as unknown as MappingRow[]).map((row) => ({
    variable: row.variable,
    priority: row.priority,
    distanceKm: row.distance_km,
    elevationDifferenceM: row.elevation_difference_m,
    selectionReason: row.selection_reason,
    manuallySelected: row.manually_selected,
    station: {
      id: row.weather_stations.id,
      sourceStationId: row.weather_stations.source_station_id,
      name: row.weather_stations.name,
    },
  }));
}
