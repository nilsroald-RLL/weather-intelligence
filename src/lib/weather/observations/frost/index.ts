import type { NormalizedObservation, ProviderHealth } from "@/types/weather";
import { fetchFrostObservations } from "./client";
import { normalizeFrostResponse } from "./normalize";

const PROVIDER_ID = "frost";

// Blindern - a station known to reliably have data, independent of whether
// any of our selected stations are currently healthy.
const HEALTH_CHECK_STATION_ID = "SN18700";

export const frostAdapter = {
  providerId: PROVIDER_ID,

  async fetchObservations(params: {
    stationId: string;
    sourceStationId: string;
    from: Date;
    to: Date;
  }): Promise<NormalizedObservation[]> {
    const { retrievedAt, response } = await fetchFrostObservations({
      sourceStationId: params.sourceStationId,
      from: params.from,
      to: params.to,
    });

    return normalizeFrostResponse({ stationId: params.stationId, retrievedAt, response });
  },

  async healthCheck(): Promise<ProviderHealth> {
    const checkedAt = new Date().toISOString();

    try {
      const now = new Date();
      const anHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      await fetchFrostObservations({
        sourceStationId: HEALTH_CHECK_STATION_ID,
        from: anHourAgo,
        to: now,
      });

      return { providerId: PROVIDER_ID, status: "healthy", checkedAt };
    } catch (error) {
      return {
        providerId: PROVIDER_ID,
        status: "down",
        checkedAt,
        message: error instanceof Error ? error.message : String(error),
      };
    }
  },
};
