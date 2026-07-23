import type { SupabaseClient } from "@supabase/supabase-js";
import type { Location } from "@/types/location";

type LocationRow = {
  id: string;
  slug: string;
  display_name: string;
  address: string;
  latitude: number;
  longitude: number;
  elevation_m: number;
  timezone: string;
  is_active: boolean;
};

function toLocation(row: LocationRow): Location {
  return {
    id: row.id,
    slug: row.slug as Location["slug"],
    displayName: row.display_name,
    address: row.address,
    latitude: row.latitude,
    longitude: row.longitude,
    elevationMeters: row.elevation_m,
    timezone: row.timezone,
    isActive: row.is_active,
  };
}

export async function getActiveLocations(client: SupabaseClient): Promise<Location[]> {
  const { data, error } = await client
    .from("locations")
    .select("id, slug, display_name, address, latitude, longitude, elevation_m, timezone, is_active")
    .eq("is_active", true)
    .order("slug");

  if (error) {
    throw new Error(`Failed to load locations: ${error.message}`);
  }

  return (data ?? []).map(toLocation);
}
