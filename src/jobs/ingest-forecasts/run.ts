import type { SupabaseClient } from "@supabase/supabase-js";
import { getActiveLocations } from "@/db/locations";
import { getForecastProviderBySlug } from "@/db/forecast-providers";
import { insertForecastPoints, insertForecastRun, insertRawPayload } from "@/db/forecasts";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";
import { MetNorwayFetchError, MetNorwayValidationError } from "@/lib/weather/providers/met-norway/client";
import { metNorwayProvider } from "@/lib/weather/providers/met-norway";
import { PARSER_VERSION } from "@/lib/weather/providers/met-norway/normalize";
import type { Location } from "@/types/location";

export type IngestLocationResult =
  | { locationSlug: string; status: "ok"; pointsInserted: number; forecastRunId: string }
  | { locationSlug: string; status: "fetch_error" | "invalid_response"; errorMessage: string };

export type IngestForecastsResult = {
  provider: string;
  startedAt: string;
  finishedAt: string;
  results: IngestLocationResult[];
};

async function ingestOneLocation(
  client: SupabaseClient,
  providerId: string,
  location: Location,
): Promise<IngestLocationResult> {
  try {
    const forecast = await metNorwayProvider.fetchForecast(location);

    const rawPayloadId = await insertRawPayload(client, {
      providerId,
      locationId: location.id,
      retrievedAt: new Date(forecast.retrievedAt),
      payload: forecast.rawPayload,
    });

    const forecastRunId = await insertForecastRun(client, {
      providerId,
      locationId: location.id,
      retrievedAt: new Date(forecast.retrievedAt),
      issuedAt: forecast.issuedAt ? new Date(forecast.issuedAt) : null,
      rawPayloadId,
      responseStatus: "ok",
      parserVersion: PARSER_VERSION,
    });

    const pointsInserted = await insertForecastPoints(client, {
      forecastRunId,
      locationId: location.id,
      providerId,
      points: forecast.points,
    });

    return { locationSlug: location.slug, status: "ok", pointsInserted, forecastRunId };
  } catch (error) {
    let responseStatus: "fetch_error" | "invalid_response" = "fetch_error";
    let rawPayloadId: string | null = null;
    let errorMessage = error instanceof Error ? error.message : String(error);
    let retrievedAt = new Date();

    if (error instanceof MetNorwayValidationError) {
      responseStatus = "invalid_response";
      retrievedAt = error.retrievedAt;
      try {
        // Best-effort: keep the raw body even though it failed validation,
        // so a parser fix can reprocess it later (ADR-003). The run record
        // below still captures the failure even if this insert also fails.
        rawPayloadId = await insertRawPayload(client, {
          providerId,
          locationId: location.id,
          retrievedAt: error.retrievedAt,
          payload: error.rawBody,
        });
      } catch {
        // Ignored - see comment above.
      }
    } else if (error instanceof MetNorwayFetchError) {
      retrievedAt = error.retrievedAt;
    }

    try {
      await insertForecastRun(client, {
        providerId,
        locationId: location.id,
        retrievedAt,
        issuedAt: null,
        rawPayloadId,
        responseStatus,
        parserVersion: PARSER_VERSION,
        errorMessage,
      });
    } catch (recordError) {
      errorMessage = `${errorMessage} (also failed to record the run: ${
        recordError instanceof Error ? recordError.message : String(recordError)
      })`;
    }

    return { locationSlug: location.slug, status: responseStatus, errorMessage };
  }
}

/**
 * Fetches and stores Yr forecasts for every active location. Idempotent and
 * safe to call repeatedly or concurrently (ADR-004): each location is
 * isolated in its own try/catch, so one location's failure never blocks the
 * other's ingestion, and forecast_points' unique constraint means retrying
 * this after a partial success never duplicates rows.
 *
 * Runs locations sequentially rather than in parallel, out of respect for
 * MET Norway's rate limits - there are only two locations, so this costs
 * nothing in practice.
 */
export async function ingestForecastsForAllLocations(): Promise<IngestForecastsResult> {
  const startedAt = new Date().toISOString();
  const client = createSupabaseServiceRoleClient();

  const provider = await getForecastProviderBySlug(client, metNorwayProvider.providerId);
  const locations = await getActiveLocations(client);

  const results: IngestLocationResult[] = [];
  for (const location of locations) {
    results.push(await ingestOneLocation(client, provider.id, location));
  }

  return {
    provider: provider.slug,
    startedAt,
    finishedAt: new Date().toISOString(),
    results,
  };
}
