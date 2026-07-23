import { env } from "@/lib/env";
import type { ForecastProvider, ProviderHealth } from "@/types/weather";
import { fetchMetNorwayForecast } from "./client";
import { normalizeMetNorwayResponse } from "./normalize";

const PROVIDER_ID = "met-norway";

// Fixed reference point for the health check - somewhere the API is known to
// have data, independent of whether Leiligheten/Hytta's own fetch is healthy.
const HEALTH_CHECK_LOCATION = { latitude: 59.91, longitude: 10.75, altitude: 0 };

export const metNorwayProvider: ForecastProvider = {
  providerId: PROVIDER_ID,

  async fetchForecast(location) {
    const { retrievedAt, response } = await fetchMetNorwayForecast(location);
    return normalizeMetNorwayResponse({
      locationId: location.id,
      providerId: PROVIDER_ID,
      retrievedAt,
      response,
      rawPayload: response,
    });
  },

  async healthCheck(): Promise<ProviderHealth> {
    const checkedAt = new Date().toISOString();
    const url = new URL("https://api.met.no/weatherapi/locationforecast/2.0/complete");
    url.searchParams.set("lat", String(HEALTH_CHECK_LOCATION.latitude));
    url.searchParams.set("lon", String(HEALTH_CHECK_LOCATION.longitude));

    try {
      const res = await fetch(url, {
        headers: { "User-Agent": env.MET_USER_AGENT },
        signal: AbortSignal.timeout(10_000),
      });

      return {
        providerId: PROVIDER_ID,
        status: res.ok ? "healthy" : "down",
        checkedAt,
        message: res.ok ? undefined : `Locationforecast returned ${res.status} ${res.statusText}`,
      };
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
