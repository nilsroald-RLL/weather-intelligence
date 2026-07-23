import { env } from "@/lib/env";
import type { Location } from "@/types/location";
import { metNorwayResponseSchema, type MetNorwayResponse } from "./schema";

const LOCATIONFORECAST_URL = "https://api.met.no/weatherapi/locationforecast/2.0/complete";
const REQUEST_TIMEOUT_MS = 15_000;

export class MetNorwayFetchError extends Error {
  readonly retrievedAt: Date;

  constructor(message: string, retrievedAt: Date) {
    super(message);
    this.name = "MetNorwayFetchError";
    this.retrievedAt = retrievedAt;
  }
}

export class MetNorwayValidationError extends Error {
  readonly retrievedAt: Date;
  readonly rawBody: unknown;

  constructor(message: string, retrievedAt: Date, rawBody: unknown) {
    super(message);
    this.name = "MetNorwayValidationError";
    this.retrievedAt = retrievedAt;
    this.rawBody = rawBody;
  }
}

export type MetNorwayFetchResult = {
  retrievedAt: Date;
  response: MetNorwayResponse;
};

/**
 * Fetches the Locationforecast "complete" product for one location. Throws
 * MetNorwayFetchError for a non-2xx/network failure (no payload to keep) or
 * MetNorwayValidationError for a response that doesn't match the expected
 * shape (raw body is attached so the caller can still store it - ADR-003).
 *
 * Known gap: does not yet send If-Modified-Since / respect Expires for
 * conditional requests, so repeated ingestion runs re-download the full
 * response even when MET's forecast hasn't changed. Fine for the manual,
 * infrequent runs in this iteration; worth adding once the real three-hourly
 * cron job is wired up, to comply with "cache responses; respect rate
 * limits" (docs/product-spec.md section 4.1).
 */
export async function fetchMetNorwayForecast(location: Location): Promise<MetNorwayFetchResult> {
  const url = new URL(LOCATIONFORECAST_URL);
  // MET Norway asks API consumers to round coordinates to ~4 decimal places
  // to improve their cache hit rate.
  url.searchParams.set("lat", location.latitude.toFixed(4));
  url.searchParams.set("lon", location.longitude.toFixed(4));
  url.searchParams.set("altitude", String(Math.round(location.elevationMeters)));

  let res: Response;
  try {
    res = await fetch(url, {
      headers: { "User-Agent": env.MET_USER_AGENT },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new MetNorwayFetchError(`Request to MET Norway failed: ${message}`, new Date());
  }

  const retrievedAt = new Date();

  if (!res.ok) {
    throw new MetNorwayFetchError(
      `MET Norway responded with ${res.status} ${res.statusText}`,
      retrievedAt,
    );
  }

  const body: unknown = await res.json();
  const parsed = metNorwayResponseSchema.safeParse(body);

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new MetNorwayValidationError(
      `MET Norway response failed validation: ${issues}`,
      retrievedAt,
      body,
    );
  }

  return { retrievedAt, response: parsed.data };
}
