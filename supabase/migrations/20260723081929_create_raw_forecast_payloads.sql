-- Raw provider responses, stored separately from normalised data so parsing
-- can be improved and history reprocessed (ADR-003). Never exposed to the
-- browser - service-role only, no authenticated read policy.

create table if not exists public.raw_forecast_payloads (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.forecast_providers (id),
  location_id uuid not null references public.locations (id),
  retrieved_at timestamptz not null,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

comment on table public.raw_forecast_payloads is
  'Unmodified provider responses. Referenced by forecast_runs.raw_payload_id, never read by app clients.';

create index if not exists raw_forecast_payloads_location_provider_idx
  on public.raw_forecast_payloads (location_id, provider_id, retrieved_at);

alter table public.raw_forecast_payloads enable row level security;

-- Insert-only: raw payloads are part of the immutable historical record,
-- same as forecast_runs and forecast_points.
grant select, insert on public.raw_forecast_payloads to service_role;
