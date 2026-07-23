import { redirect } from "next/navigation";
import { LocationForecastCard } from "@/components/weather/location-forecast-card";
import { getForecastProviderBySlug } from "@/db/forecast-providers";
import { getForecastPointsForRun, getLatestForecastRun } from "@/db/forecasts";
import { getActiveLocations } from "@/db/locations";
import { aggregateDailyForecast, pickCurrentConditions } from "@/lib/weather/forecast-view";
import { metNorwayProvider } from "@/lib/weather/providers/met-norway";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // The locations and forecast tables are authenticated-read only (see their
  // migrations), so an anonymous visitor would see nothing anyway - redirect
  // rather than render a silently empty page.
  if (!user) {
    redirect("/login?next=/");
  }

  const [locations, provider] = await Promise.all([
    getActiveLocations(supabase),
    getForecastProviderBySlug(supabase, metNorwayProvider.providerId),
  ]);

  const now = new Date();

  const cards = await Promise.all(
    locations.map(async (location) => {
      const run = await getLatestForecastRun(supabase, {
        locationId: location.id,
        providerId: provider.id,
      });

      if (!run) {
        return { location, current: undefined, dailySummaries: [], updatedAt: null };
      }

      const points = await getForecastPointsForRun(supabase, run.id);

      return {
        location,
        current: pickCurrentConditions(points, now),
        dailySummaries: aggregateDailyForecast(points, { now }),
        updatedAt: run.issuedAt ?? run.retrievedAt,
      };
    }),
  );

  return (
    <div className="flex flex-1 flex-col items-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex w-full max-w-2xl flex-col items-center gap-6 px-6 py-16">
        <h1 className="text-xl font-semibold">Weather Intelligence</h1>
        <div className="grid w-full gap-6 sm:grid-cols-2">
          {cards.map(({ location, current, dailySummaries, updatedAt }) => (
            <LocationForecastCard
              key={location.id}
              displayName={location.displayName}
              current={current}
              dailySummaries={dailySummaries}
              updatedAt={updatedAt}
            />
          ))}
        </div>
      </main>
    </div>
  );
}
