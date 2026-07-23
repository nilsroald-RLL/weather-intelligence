-- One row per provider retrieval. See docs/architecture.md section 5.

create table if not exists public.forecast_runs (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.forecast_providers (id),
  location_id uuid not null references public.locations (id),
  retrieved_at timestamptz not null,
  issued_at timestamptz,
  raw_payload_id uuid references public.raw_forecast_payloads (id),
  response_status text not null
    check (response_status in ('ok', 'fetch_error', 'invalid_response')),
  parser_version text not null,
  error_message text,
  created_at timestamptz not null default now()
);

comment on table public.forecast_runs is
  'One row per fetch attempt, success or failure, so failures are visible rather than silently dropped.';

create index if not exists forecast_runs_location_provider_retrieved_idx
  on public.forecast_runs (location_id, provider_id, retrieved_at desc);

alter table public.forecast_runs enable row level security;

grant select on public.forecast_runs to authenticated;
-- Insert-only for service_role: a run is written once and never revised,
-- same append-only rule as forecast_points (ADR-005).
grant select, insert on public.forecast_runs to service_role;

drop policy if exists "Authenticated users can read forecast runs" on public.forecast_runs;

create policy "Authenticated users can read forecast runs"
  on public.forecast_runs
  for select
  to authenticated
  using (true);
