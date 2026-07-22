-- This project doesn't auto-expose newly created public-schema tables to the
-- Data API roles (see the auto_expose_new_tables note in supabase/config.toml),
-- so RLS policies alone aren't enough - the underlying GRANT is also required.
-- Without this, even service_role gets "permission denied for table ...".

grant select, insert, update, delete on public.approved_emails to service_role;

-- Matches the locations select policy: authenticated users can read, writes
-- stay service-role only.
grant select on public.locations to authenticated;
grant select, insert, update, delete on public.locations to service_role;
