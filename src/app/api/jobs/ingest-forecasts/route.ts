import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import { ingestForecastsForAllLocations } from "@/jobs/ingest-forecasts/run";

/**
 * Protected job endpoint (ADR-004). Not on any real schedule yet - trigger
 * manually for now:
 *
 *   curl -X POST http://127.0.0.1:3000/api/jobs/ingest-forecasts \
 *     -H "Authorization: Bearer $CRON_SECRET"
 */
export async function POST(request: NextRequest) {
  const expected = `Bearer ${env.CRON_SECRET}`;

  if (request.headers.get("authorization") !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await ingestForecastsForAllLocations();
  const hasFailure = result.results.some((locationResult) => locationResult.status !== "ok");

  return NextResponse.json(result, { status: hasFailure ? 207 : 200 });
}
