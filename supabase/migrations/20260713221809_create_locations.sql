-- The two fixed properties the app serves: Leiligheten and Hytta.
-- See docs/architecture.md section 5 for the full data model.

create table if not exists public.locations (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  display_name text not null,
  address text not null,
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  elevation_m double precision not null,
  timezone text not null default 'Europe/Oslo',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

comment on table public.locations is
  'The fixed properties the app forecasts for. Coordinates are entered once and not re-geocoded on every request.';

-- Row-level security is enabled by default; policies are added alongside
-- authentication (see docs/backlog.md, Phase 1: Authentication).
alter table public.locations enable row level security;
