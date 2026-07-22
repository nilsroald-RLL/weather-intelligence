-- Now that sign-in exists, allow signed-in users to read the two locations.
-- Writes stay service-role only (ingestion jobs), so no insert/update/delete
-- policy is added here.

create policy "Authenticated users can read locations"
  on public.locations
  for select
  to authenticated
  using (true);
