import type { SupabaseClient } from "@supabase/supabase-js";

export type ForecastProviderRow = {
  id: string;
  slug: string;
  name: string;
};

export async function getForecastProviderBySlug(
  client: SupabaseClient,
  slug: string,
): Promise<ForecastProviderRow> {
  const { data, error } = await client
    .from("forecast_providers")
    .select("id, slug, name")
    .eq("slug", slug)
    .single();

  if (error || !data) {
    throw new Error(
      `Forecast provider "${slug}" not found: ${error?.message ?? "no matching row"}`,
    );
  }

  return data;
}
