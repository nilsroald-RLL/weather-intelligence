-- Candidate/selected Frost observation stations. Mutable reference data (a
-- station's own metadata can be refreshed), not historical - service_role
-- keeps full CRUD, unlike the observation history itself.
-- See docs/station-selection.md for the discovery method and full rationale.

create table if not exists public.weather_stations (
  id uuid primary key default gen_random_uuid(),
  source text not null default 'frost',
  source_station_id text not null,
  name text not null,
  latitude double precision not null,
  longitude double precision not null,
  elevation_m double precision,
  metadata jsonb not null default '{}'::jsonb,
  active_from timestamptz,
  active_to timestamptz,
  created_at timestamptz not null default now(),
  unique (source, source_station_id)
);

comment on table public.weather_stations is
  'Frost observation stations referenced by location_station_mappings. See docs/station-selection.md.';

alter table public.weather_stations enable row level security;

grant select on public.weather_stations to authenticated;
grant select, insert, update, delete on public.weather_stations to service_role;

drop policy if exists "Authenticated users can read weather stations" on public.weather_stations;

create policy "Authenticated users can read weather stations"
  on public.weather_stations
  for select
  to authenticated
  using (true);

-- Seed the stations selected or considered as a fallback for Leiligheten and
-- Hytta. See docs/station-selection.md for the full candidate list and why
-- each of these was (or wasn't) chosen.
insert into public.weather_stations (source_station_id, name, latitude, longitude, elevation_m, metadata)
values
  ('SN18700', 'Oslo - Blindern', 59.9423, 10.72, 94,
    '{"holder": "MET.NO", "exposureCategory": 1, "note": "Primary long-running Oslo climate station"}'::jsonb),
  ('SN18165', 'Oslo - Ryen', 59.8963, 10.8013, 130,
    '{"holder": "Oslo kommune, VAV ROSIM", "exposureCategory": 2, "note": "Precipitation-only urban drainage gauge"}'::jsonb),
  ('SN18020', 'Oslo - Lambertseter', 59.8775, 10.8185, 135,
    '{"holder": "Oslo kommune, VAV", "exposureCategory": 2, "note": "Temperature and precipitation"}'::jsonb),
  ('SN18210', 'Oslo - Hovin', 59.923, 10.804, 100,
    '{"holder": "MET.NO, Oslo kommune", "exposureCategory": 2, "note": "Full variable set, closer than Blindern"}'::jsonb),
  ('SN12960', 'Sjusjøen - Storåsen', 61.1638, 10.7088, 930,
    '{"holder": "MET.NO", "exposureCategory": 2, "note": "Best elevation match for Hytta"}'::jsonb),
  ('SN13110', 'E6 Fåberg', 61.16967, 10.41067, 205,
    '{"holder": "Statens vegvesen", "exposureCategory": 4, "note": "Road-weather station, closer but poor elevation match"}'::jsonb)
on conflict (source, source_station_id) do nothing;
