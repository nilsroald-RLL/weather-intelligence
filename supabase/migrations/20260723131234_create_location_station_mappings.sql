-- Which station serves which variable for which location. A location can
-- (and here does) use a different station per variable - see
-- docs/station-selection.md for the discovery method and full rationale.
-- Mutable reference data, same as weather_stations: manually_selected exists
-- precisely so a choice here can be overridden later without a migration.

create table if not exists public.location_station_mappings (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references public.locations (id),
  station_id uuid not null references public.weather_stations (id),
  variable text not null
    check (variable in (
      'air_temperature', 'precipitation_amount', 'wind_speed',
      'wind_direction', 'relative_humidity', 'air_pressure'
    )),
  priority integer not null default 1,
  distance_km double precision not null,
  elevation_difference_m double precision not null,
  selection_reason text not null,
  manually_selected boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (location_id, variable, priority)
);

comment on table public.location_station_mappings is
  'Primary + fallback station per (location, variable), with distance/elevation and a written rationale. See docs/station-selection.md.';

create index if not exists location_station_mappings_location_variable_idx
  on public.location_station_mappings (location_id, variable, active);

alter table public.location_station_mappings enable row level security;

grant select on public.location_station_mappings to authenticated;
grant select, insert, update, delete on public.location_station_mappings to service_role;

drop policy if exists "Authenticated users can read location station mappings" on public.location_station_mappings;

create policy "Authenticated users can read location station mappings"
  on public.location_station_mappings
  for select
  to authenticated
  using (true);

-- Primary (priority 1) and fallback (priority 2) station per variable.
-- Elevation difference is signed (station elevation minus location
-- elevation) so it's clear which direction the gap runs.
insert into public.location_station_mappings
  (location_id, station_id, variable, priority, distance_km, elevation_difference_m, selection_reason)
select l.id, s.id, m.variable, m.priority, m.distance_km, m.elevation_difference_m, m.selection_reason
from (
  values
    ('leiligheten', 'SN18700', 'air_temperature', 1, 7.48, -25,
      'Best elevation match (94m vs 119m) and the richest, longest-running variable set among candidates (MET''s primary Oslo climate station, exposureCategory 1). The closer alternatives are municipal storm-drain gauges with no temperature sensor.'),
    ('leiligheten', 'SN18210', 'air_temperature', 2, 4.71, -19,
      'Closer fallback with a full variable set if Blindern is unavailable.'),
    ('leiligheten', 'SN18165', 'precipitation_amount', 1, 1.94, 11,
      'Closest station; precipitation is highly spatially variable, so proximity is weighted over elevation match here.'),
    ('leiligheten', 'SN18020', 'precipitation_amount', 2, 2.19, 16,
      'Next-closest precipitation-reporting station.'),
    ('leiligheten', 'SN18700', 'wind_speed', 1, 7.48, -25,
      'Same reasoning as temperature: the most complete and reliable wind record among candidates.'),
    ('leiligheten', 'SN18210', 'wind_speed', 2, 4.71, -19,
      'Closer fallback.'),
    ('leiligheten', 'SN18700', 'wind_direction', 1, 7.48, -25,
      'Same reasoning as temperature and wind speed.'),
    ('leiligheten', 'SN18210', 'wind_direction', 2, 4.71, -19,
      'Closer fallback.'),
    ('leiligheten', 'SN18700', 'relative_humidity', 1, 7.48, -25,
      'Same reasoning as temperature.'),
    ('leiligheten', 'SN18210', 'relative_humidity', 2, 4.71, -19,
      'Closer fallback.'),
    ('leiligheten', 'SN18700', 'air_pressure', 1, 7.48, -25,
      'Only candidate reporting sea-level pressure; no fallback identified within a reasonable radius.'),
    ('hytta', 'SN12960', 'air_temperature', 1, 14.89, 166,
      'Elevation dominates at 764m: Storåsen (930m) is the closest station with an acceptable elevation match. A live check showed it reading several degrees cooler than lower-elevation alternatives, consistent with the expected lapse rate.'),
    ('hytta', 'SN13110', 'air_temperature', 2, 9.91, -559,
      'Closer but 559m lower and a road-weather station (exposureCategory 4); kept only as a fallback.'),
    ('hytta', 'SN12960', 'precipitation_amount', 1, 14.89, 166,
      'Same reasoning as temperature - the best elevation and terrain match among candidates.'),
    ('hytta', 'SN13110', 'precipitation_amount', 2, 9.91, -559,
      'Closer fallback.'),
    ('hytta', 'SN12960', 'wind_speed', 1, 14.89, 166,
      'Same reasoning as temperature.'),
    ('hytta', 'SN13110', 'wind_speed', 2, 9.91, -559,
      'Closer fallback.'),
    ('hytta', 'SN12960', 'wind_direction', 1, 14.89, 166,
      'Same reasoning as temperature.'),
    ('hytta', 'SN13110', 'wind_direction', 2, 9.91, -559,
      'Closer fallback.'),
    ('hytta', 'SN12960', 'relative_humidity', 1, 14.89, 166,
      'Same reasoning as temperature.'),
    ('hytta', 'SN13110', 'relative_humidity', 2, 9.91, -559,
      'Closer fallback.')
) as m(location_slug, source_station_id, variable, priority, distance_km, elevation_difference_m, selection_reason)
join public.locations l on l.slug = m.location_slug
join public.weather_stations s on s.source_station_id = m.source_station_id
on conflict (location_id, variable, priority) do nothing;
