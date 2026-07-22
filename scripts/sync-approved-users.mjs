// Provisions the sign-in allow-list. Run manually whenever
// APPROVED_LOGIN_EMAILS changes:
//
//   npm run auth:sync-users
//
// For each address it: records it in public.approved_emails, and creates a
// matching Supabase auth user if one doesn't already exist (with no password
// set yet - run `npm run auth:set-password -- <email>` afterwards so that
// address can actually sign in). Editing approved_emails by hand is not
// enough on its own, since login also requires a real auth user.

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const approvedEmailsRaw = process.env.APPROVED_LOGIN_EMAILS;

if (!url || !serviceRoleKey || !approvedEmailsRaw) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or " +
      "APPROVED_LOGIN_EMAILS. Populate .env.local, then run: npm run auth:sync-users",
  );
  process.exit(1);
}

const emails = approvedEmailsRaw
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

if (emails.length === 0) {
  console.error("APPROVED_LOGIN_EMAILS is set but contains no email addresses.");
  process.exit(1);
}

const supabase = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers({
  page: 1,
  perPage: 200,
});

if (listError) {
  console.error("Failed to list existing Supabase auth users:", listError.message);
  process.exit(1);
}

let hadError = false;

for (const email of emails) {
  const { error: upsertError } = await supabase
    .from("approved_emails")
    .upsert({ email }, { onConflict: "email" });

  if (upsertError) {
    console.error(`${email}: failed to record as approved:`, upsertError.message);
    hadError = true;
    continue;
  }

  const alreadyProvisioned = existingUsers.users.some(
    (user) => user.email?.toLowerCase() === email,
  );

  if (alreadyProvisioned) {
    console.log(`${email}: already approved and provisioned.`);
    continue;
  }

  const { error: createError } = await supabase.auth.admin.createUser({
    email,
    email_confirm: true,
  });

  if (createError) {
    console.error(`${email}: failed to provision an auth user:`, createError.message);
    hadError = true;
    continue;
  }

  console.log(`${email}: approved and provisioned.`);
}

if (hadError) {
  process.exitCode = 1;
}
