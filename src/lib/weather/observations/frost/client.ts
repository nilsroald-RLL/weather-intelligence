import { env } from "@/lib/env";
import { frostObservationsResponseSchema, type FrostObservationsResponse } from "./schema";

const OBSERVATIONS_URL = "https://frost.met.no/observations/v0.jsonld";
const REQUEST_TIMEOUT_MS = 15_000;

const ELEMENTS = [
  "air_temperature",
  "relative_humidity",
  "wind_speed",
  "wind_from_direction",
  "max(wind_speed_of_gust PT1H)",
  "air_pressure_at_sea_level",
  "sum(precipitation_amount PT1H)",
].join(",");

export class FrostFetchError extends Error {
  readonly retrievedAt: Date;

  constructor(message: string, retrievedAt: Date) {
    super(message);
    this.name = "FrostFetchError";
    this.retrievedAt = retrievedAt;
  }
}

export class FrostValidationError extends Error {
  readonly retrievedAt: Date;
  readonly rawBody: unknown;

  constructor(message: string, retrievedAt: Date, rawBody: unknown) {
    super(message);
    this.name = "FrostValidationError";
    this.retrievedAt = retrievedAt;
    this.rawBody = rawBody;
  }
}

export type FrostFetchResult = {
  retrievedAt: Date;
  response: FrostObservationsResponse;
};

/**
 * Fetches recent observations for one Frost station over [from, to). A 404
 * means "no observations in this window" - a normal condition (reporting
 * delay, a quiet station), not a failure - so it resolves to an empty
 * response rather than throwing (verified live: Frost returns 404, not an
 * empty 200, when nothing matches).
 */
export async function fetchFrostObservations(params: {
  sourceStationId: string;
  from: Date;
  to: Date;
}): Promise<FrostFetchResult> {
  const url = new URL(OBSERVATIONS_URL);
  url.searchParams.set("sources", params.sourceStationId);
  url.searchParams.set("elements", ELEMENTS);
  url.searchParams.set("referencetime", `${params.from.toISOString()}/${params.to.toISOString()}`);

  const auth = Buffer.from(`${env.FROST_CLIENT_ID}:`).toString("base64");

  let res: Response;
  try {
    res = await fetch(url, {
      headers: { Authorization: `Basic ${auth}` },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new FrostFetchError(`Request to Frost failed: ${message}`, new Date());
  }

  const retrievedAt = new Date();

  if (res.status === 404) {
    return { retrievedAt, response: { data: [] } };
  }

  if (!res.ok) {
    throw new FrostFetchError(`Frost responded with ${res.status} ${res.statusText}`, retrievedAt);
  }

  const body: unknown = await res.json();
  const parsed = frostObservationsResponseSchema.safeParse(body);

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new FrostValidationError(`Frost response failed validation: ${issues}`, retrievedAt, body);
  }

  return { retrievedAt, response: parsed.data };
}
