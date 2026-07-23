-- Immutable observation history per station. Same discipline as
-- forecast_points: insert-only, unique constraint makes re-ingestion of an
-- overlapping time window idempotent, no update/delete grant at all.

create table if not exists public.observations (
  id uuid primary key default gen_random_uuid(),
  station_id uuid not null references public.weather_stations (id),
  observed_at timestamptz not null,
  air_temperature_c double precision,
  precipitation_amount_mm double precision,
  wind_speed_mps double precision,
  wind_gust_mps double precision,
  wind_direction_deg double precision,
  relative_humidity_pct double precision,
  air_pressure_hpa double precision,
  quality_code text,
  source_provider text not null default 'frost',
  retrieved_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (station_id, observed_at)
);

comment on table public.observations is
  'Immutable per-station observation history. Never updated - insert with on conflict (station_id, observed_at) do nothing.';

create index if not exists observations_station_observed_idx
  on public.observations (station_id, observed_at desc);

alter table public.observations enable row level security;

grant select on public.observations to authenticated;
-- Insert-only, deliberately no update/delete grant - same immutability
-- enforcement as forecast_points (hard rule: never overwrite history).
grant select, insert on public.observations to service_role;

drop policy if exists "Authenticated users can read observations" on public.observations;

create policy "Authenticated users can read observations"
  on public.observations
  for select
  to authenticated
  using (true);
