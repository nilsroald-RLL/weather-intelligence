-- One row per target timestamp within a run. Immutable: never updated, only
-- inserted, with a unique constraint that makes re-processing the same run
-- idempotent (many rows can share a target_time across different runs - that
-- is the whole point of keeping historical snapshots).

create table if not exists public.forecast_points (
  id uuid primary key default gen_random_uuid(),
  forecast_run_id uuid not null references public.forecast_runs (id),
  location_id uuid not null references public.locations (id),
  provider_id uuid not null references public.forecast_providers (id),
  target_time timestamptz not null,
  forecast_horizon_minutes integer not null,
  air_temperature_c double precision,
  min_temperature_c double precision,
  max_temperature_c double precision,
  apparent_temperature_c double precision,
  precipitation_amount_mm double precision,
  precipitation_probability_pct double precision,
  wind_speed_mps double precision,
  wind_gust_mps double precision,
  wind_direction_deg double precision,
  relative_humidity_pct double precision,
  air_pressure_hpa double precision,
  cloud_area_fraction_pct double precision,
  weather_symbol_code text,
  source_weather_code text,
  created_at timestamptz not null default now(),
  unique (forecast_run_id, target_time)
);

comment on table public.forecast_points is
  'Immutable forecast snapshots. Never updated - insert with on conflict (forecast_run_id, target_time) do nothing.';

create index if not exists forecast_points_location_provider_target_idx
  on public.forecast_points (location_id, provider_id, target_time);

create index if not exists forecast_points_horizon_idx
  on public.forecast_points (forecast_horizon_minutes);

alter table public.forecast_points enable row level security;

grant select on public.forecast_points to authenticated;
-- Insert-only, deliberately no update/delete grant: forecast snapshots are
-- immutable (hard rule - never overwrite a historical forecast). Enforced at
-- the permission level, not just by application discipline.
grant select, insert on public.forecast_points to service_role;

drop policy if exists "Authenticated users can read forecast points" on public.forecast_points;

create policy "Authenticated users can read forecast points"
  on public.forecast_points
  for select
  to authenticated
  using (true);
