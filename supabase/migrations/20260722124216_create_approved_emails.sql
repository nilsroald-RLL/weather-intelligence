-- Approved-user allow-list for magic-link sign-in. Real addresses are never
-- committed here; they are synced in from the APPROVED_LOGIN_EMAILS
-- environment variable via `npm run auth:sync-users`.

create table if not exists public.approved_emails (
  email text primary key,
  created_at timestamptz not null default now()
);

comment on table public.approved_emails is
  'Emails allowed to sign in. Populated by scripts/sync-approved-users.mjs, never by hand.';

-- RLS is enabled with no policies for anon/authenticated, so this table is
-- reachable only via the service-role key (used server-side in the sign-in
-- server action and the sync script).
alter table public.approved_emails enable row level security;
