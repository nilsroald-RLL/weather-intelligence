import type { StoredForecastPoint } from "@/db/forecasts";
import { nextOsloDateKeys, toOsloDateKey } from "@/lib/weather/time/oslo-time";

function isNumber(value: number | null | undefined): value is number {
  return typeof value === "number";
}

/** The stored point whose target time is closest to `now` - used as "current conditions". */
export function pickCurrentConditions(
  points: StoredForecastPoint[],
  now: Date = new Date(),
): StoredForecastPoint | undefined {
  if (points.length === 0) return undefined;

  return points.reduce((closest, point) => {
    const closestDiff = Math.abs(new Date(closest.targetTime).getTime() - now.getTime());
    const pointDiff = Math.abs(new Date(point.targetTime).getTime() - now.getTime());
    return pointDiff < closestDiff ? point : closest;
  });
}

export type DailyForecastSummary = {
  dateKey: string;
  minTemperatureC?: number;
  maxTemperatureC?: number;
  totalPrecipitationMm?: number;
  representativeSymbolCode?: string;
  pointCount: number;
};

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

/**
 * Groups stored points into Europe/Oslo calendar days and computes a daily
 * high/low/precipitation summary (docs/product-spec.md section 14). A day
 * with no ingested points yet gets an empty summary (all fields undefined)
 * rather than zeros - there is a real difference between "no rain expected"
 * and "we don't have data for this day yet".
 */
export function aggregateDailyForecast(
  points: StoredForecastPoint[],
  options: { now?: Date; days?: number } = {},
): DailyForecastSummary[] {
  const now = options.now ?? new Date();
  const days = options.days ?? 7;
  const dateKeys = nextOsloDateKeys(now, days);

  const byDateKey = new Map<string, StoredForecastPoint[]>();
  for (const point of points) {
    const key = toOsloDateKey(new Date(point.targetTime));
    const bucket = byDateKey.get(key);
    if (bucket) {
      bucket.push(point);
    } else {
      byDateKey.set(key, [point]);
    }
  }

  return dateKeys.map((dateKey) => {
    const dayPoints = byDateKey.get(dateKey) ?? [];

    const temperatures = dayPoints
      .flatMap((point) => [point.airTemperatureC, point.minTemperatureC, point.maxTemperatureC])
      .filter(isNumber);

    const precipitationValues = dayPoints.map((point) => point.precipitationAmountMm).filter(isNumber);

    const representativeSymbolCode =
      dayPoints.find((point) => point.sourceWeatherCode != null)?.sourceWeatherCode ?? undefined;

    return {
      dateKey,
      minTemperatureC: temperatures.length > 0 ? Math.min(...temperatures) : undefined,
      maxTemperatureC: temperatures.length > 0 ? Math.max(...temperatures) : undefined,
      totalPrecipitationMm:
        precipitationValues.length > 0 ? round1(precipitationValues.reduce((a, b) => a + b, 0)) : undefined,
      representativeSymbolCode,
      pointCount: dayPoints.length,
    };
  });
}
