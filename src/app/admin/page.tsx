import { redirect } from "next/navigation";
import { signOut } from "./actions";
import { getActiveLocations } from "@/db/locations";
import { getActiveMappingsForLocation } from "@/db/location-station-mappings";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const VARIABLE_LABELS: Record<string, string> = {
  air_temperature: "Temperatur",
  precipitation_amount: "Nedbør",
  wind_speed: "Vindstyrke",
  wind_direction: "Vindretning",
  relative_humidity: "Luftfuktighet",
  air_pressure: "Lufttrykk",
};

function formatElevationDifference(value: number): string {
  const rounded = Math.round(value);
  return rounded > 0 ? `+${rounded} m` : `${rounded} m`;
}

export default async function AdminPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Middleware already guards /admin; this repeats the check so the page is
  // still safe if that matcher is ever narrowed by mistake.
  if (!user) {
    redirect("/login?next=/admin");
  }

  const locations = await getActiveLocations(supabase);
  const locationMappings = await Promise.all(
    locations.map(async (location) => ({
      location,
      mappings: await getActiveMappingsForLocation(supabase, location.id),
    })),
  );

  return (
    <div className="flex flex-1 flex-col items-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex w-full max-w-2xl flex-col items-center gap-6 px-6 py-16">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Admin</CardTitle>
            <CardDescription>Logget inn som {user.email}.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={signOut}>
              <Button type="submit" variant="outline" className="w-full">
                Logg ut
              </Button>
            </form>
          </CardContent>
        </Card>

        {locationMappings.map(({ location, mappings }) => (
          <Card key={location.id} className="w-full">
            <CardHeader>
              <CardTitle>{location.displayName}</CardTitle>
              <CardDescription>Valgte værstasjoner per variabel</CardDescription>
            </CardHeader>
            <CardContent>
              {mappings.length === 0 ? (
                <p className="text-sm text-muted-foreground">Ingen stasjoner valgt ennå.</p>
              ) : (
                <ul className="flex flex-col gap-3 text-sm">
                  {mappings.map((mapping) => (
                    <li key={`${mapping.variable}-${mapping.priority}`}>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium">
                          {VARIABLE_LABELS[mapping.variable] ?? mapping.variable}
                          {mapping.priority > 1 && (
                            <span className="ml-1.5 text-xs text-muted-foreground">(reserve)</span>
                          )}
                        </span>
                        <span className="text-muted-foreground">
                          {mapping.station.name} · {mapping.distanceKm.toFixed(1)} km ·{" "}
                          {formatElevationDifference(mapping.elevationDifferenceM)}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">{mapping.selectionReason}</p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        ))}
      </main>
    </div>
  );
}
