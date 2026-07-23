-- One row per forecast source. See docs/architecture.md section 5.

create table if not exists public.forecast_providers (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  adapter_type text not null default 'rest-api',
  enabled boolean not null default true,
  terms_notes text,
  last_success_at timestamptz,
  last_failure_at timestamptz,
  health_status text not null default 'unknown'
    check (health_status in ('unknown', 'healthy', 'degraded', 'down')),
  created_at timestamptz not null default now()
);

comment on table public.forecast_providers is
  'Forecast sources (Yr/MET Norway, Storm when implemented). One row per adapter.';

insert into public.forecast_providers (slug, name, adapter_type, terms_notes)
values (
  'met-norway',
  'Yr / MET Norway',
  'rest-api',
  'Locationforecast 2.0. Requires a descriptive User-Agent (MET_USER_AGENT); see docs/product-spec.md section 4.1.'
)
on conflict (slug) do nothing;

alter table public.forecast_providers enable row level security;

grant select on public.forecast_providers to authenticated;
grant select, insert, update, delete on public.forecast_providers to service_role;

drop policy if exists "Authenticated users can read forecast providers" on public.forecast_providers;

create policy "Authenticated users can read forecast providers"
  on public.forecast_providers
  for select
  to authenticated
  using (true);
