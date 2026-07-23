import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import { ingestObservationsForAllLocations } from "@/jobs/ingest-observations/run";

/**
 * Protected job endpoint (ADR-004), mirroring /api/jobs/ingest-forecasts.
 * Not on a real schedule yet - trigger manually:
 *
 *   curl -X POST http://127.0.0.1:3000/api/jobs/ingest-observations \
 *     -H "Authorization: Bearer $CRON_SECRET"
 */
export async function POST(request: NextRequest) {
  const expected = `Bearer ${env.CRON_SECRET}`;

  if (request.headers.get("authorization") !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await ingestObservationsForAllLocations();
  const hasFailure = result.results.some((stationResult) => stationResult.status !== "ok");

  return NextResponse.json(result, { status: hasFailure ? 207 : 200 });
}
