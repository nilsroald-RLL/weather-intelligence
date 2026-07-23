import type { SupabaseClient } from "@supabase/supabase-js";
import { getActiveLocations } from "@/db/locations";
import { getActiveMappingsForLocation } from "@/db/location-station-mappings";
import { insertObservations } from "@/db/observations";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";
import { FrostValidationError } from "@/lib/weather/observations/frost/client";
import { frostAdapter } from "@/lib/weather/observations/frost";

const LOOKBACK_HOURS = 3;

export type IngestStationResult =
  | {
      stationName: string;
      sourceStationId: string;
      status: "ok";
      observationsInserted: number;
    }
  | {
      stationName: string;
      sourceStationId: string;
      status: "fetch_error" | "invalid_response";
      errorMessage: string;
    };

export type IngestObservationsResult = {
  startedAt: string;
  finishedAt: string;
  results: IngestStationResult[];
};

type StationRef = { id: string; sourceStationId: string; name: string };

async function ingestOneStation(client: SupabaseClient, station: StationRef): Promise<IngestStationResult> {
  try {
    const now = new Date();
    const from = new Date(now.getTime() - LOOKBACK_HOURS * 60 * 60 * 1000);

    const observations = await frostAdapter.fetchObservations({
      stationId: station.id,
      sourceStationId: station.sourceStationId,
      from,
      to: now,
    });

    const observationsInserted = await insertObservations(client, {
      stationId: station.id,
      observations,
    });

    return {
      stationName: station.name,
      sourceStationId: station.sourceStationId,
      status: "ok",
      observationsInserted,
    };
  } catch (error) {
    const status = error instanceof FrostValidationError ? "invalid_response" : "fetch_error";
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Observation ingestion failed for ${station.name} (${station.sourceStationId}):`, errorMessage);
    return { stationName: station.name, sourceStationId: station.sourceStationId, status, errorMessage };
  }
}

/**
 * Fetches and stores recent Frost observations for every distinct station
 * currently mapped (active) to any location, across any variable - a
 * station serving several variables (e.g. Blindern for Leiligheten's
 * temperature, wind, and humidity) is only fetched once. Idempotent (unique
 * constraint on station_id+observed_at) and isolates each station's failure
 * so one station's outage never blocks another's ingestion.
 *
 * There's no observation_runs table (unlike forecast_runs), so a failure
 * has nowhere to be recorded in the database yet - it's logged and
 * surfaced in this function's return value instead.
 */
export async function ingestObservationsForAllLocations(): Promise<IngestObservationsResult> {
  const startedAt = new Date().toISOString();
  const client = createSupabaseServiceRoleClient();

  const locations = await getActiveLocations(client);

  const stationsById = new Map<string, StationRef>();
  for (const location of locations) {
    const mappings = await getActiveMappingsForLocation(client, location.id);
    for (const mapping of mappings) {
      stationsById.set(mapping.station.id, {
        id: mapping.station.id,
        sourceStationId: mapping.station.sourceStationId,
        name: mapping.station.name,
      });
    }
  }

  const results: IngestStationResult[] = [];
  for (const station of stationsById.values()) {
    results.push(await ingestOneStation(client, station));
  }

  return { startedAt, finishedAt: new Date().toISOString(), results };
}
