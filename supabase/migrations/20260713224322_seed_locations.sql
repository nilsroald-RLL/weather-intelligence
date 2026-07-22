-- Seed the two fixed properties. Coordinates are geocoded from the exact
-- house addresses (OpenStreetMap Nominatim) and elevation is from the
-- EU-DEM 25m dataset, cross-checked against a second elevation source.
-- Idempotent: safe to run again without creating duplicates.

insert into public.locations
  (slug, display_name, address, latitude, longitude, elevation_m, timezone)
values
  (
    'leiligheten',
    'Leiligheten',
    'Kongsveien 83C, Oslo',
    59.882266,
    10.780495,
    119,
    'Europe/Oslo'
  ),
  (
    'hytta',
    'Hytta',
    'Moltmyrvegen 39, Øyer',
    61.249116,
    10.494436,
    764,
    'Europe/Oslo'
  )
on conflict (slug) do nothing;
