import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { StoredForecastPoint } from "@/db/forecasts";
import type { DailyForecastSummary } from "@/lib/weather/forecast-view";

// 8-point compass, Norwegian. MET gives wind direction as a bearing in
// degrees; this is purely a display convenience.
const COMPASS_LABELS = ["nord", "nordøst", "øst", "sørøst", "sør", "sørvest", "vest", "nordvest"];

function windDirectionLabel(degrees: number): string {
  const index = Math.round(degrees / 45) % COMPASS_LABELS.length;
  return COMPASS_LABELS[index] ?? "";
}

function formatTemperature(value: number | null | undefined): string | null {
  if (typeof value !== "number") return null;
  return `${Math.round(value * 10) / 10}°`;
}

const dayFormatter = new Intl.DateTimeFormat("nb-NO", {
  timeZone: "Europe/Oslo",
  weekday: "short",
  day: "numeric",
  month: "short",
});

const updatedAtFormatter = new Intl.DateTimeFormat("nb-NO", {
  timeZone: "Europe/Oslo",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

function formatDayLabel(dateKey: string): string {
  // Noon UTC is always safely inside the same Oslo calendar day, regardless
  // of DST offset, so this can't drift to the adjacent day near midnight.
  return dayFormatter.format(new Date(`${dateKey}T12:00:00Z`));
}

export function LocationForecastCard({
  displayName,
  current,
  dailySummaries,
  updatedAt,
}: {
  displayName: string;
  current: StoredForecastPoint | undefined;
  dailySummaries: DailyForecastSummary[];
  updatedAt: string | null;
}) {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{displayName}</CardTitle>
        <CardDescription>
          {updatedAt
            ? `Sist oppdatert: ${updatedAtFormatter.format(new Date(updatedAt))}`
            : "Ingen data ennå"}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <section>
          <h3 className="text-xs font-medium uppercase text-muted-foreground">Nå</h3>
          {current ? (
            <>
              <p className="text-2xl font-semibold">{formatTemperature(current.airTemperatureC) ?? "–"}</p>
              <p className="text-sm text-muted-foreground">
                {current.sourceWeatherCode ?? "Ukjent forhold"}
                {typeof current.windSpeedMps === "number" && (
                  <>
                    {" · "}
                    {current.windSpeedMps} m/s
                    {typeof current.windDirectionDeg === "number" &&
                      ` ${windDirectionLabel(current.windDirectionDeg)}`}
                  </>
                )}
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Ingen forecast ennå. Kjør innhentingsjobben for å hente værdata.
            </p>
          )}
        </section>

        {dailySummaries.length > 0 && (
          <section>
            <h3 className="text-xs font-medium uppercase text-muted-foreground">7 dager</h3>
            <ul className="flex flex-col gap-1 text-sm">
              {dailySummaries.map((day) => (
                <li key={day.dateKey} className="flex items-center justify-between gap-2">
                  <span className="capitalize">{formatDayLabel(day.dateKey)}</span>
                  <span className="text-muted-foreground">
                    {formatTemperature(day.maxTemperatureC) ?? "–"} /{" "}
                    {formatTemperature(day.minTemperatureC) ?? "–"}
                    {typeof day.totalPrecipitationMm === "number" && ` · ${day.totalPrecipitationMm} mm`}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section>
          <h3 className="text-xs font-medium uppercase text-muted-foreground">Storm</h3>
          <p className="text-sm text-muted-foreground">Ikke tilgjengelig ennå.</p>
        </section>
      </CardContent>
    </Card>
  );
}
