"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { env } from "@/lib/env";
import { safeNextPath } from "@/lib/safe-next-path";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const emailSchema = z
  .string()
  .transform((value) => value.trim().toLowerCase())
  .pipe(z.string().email());

export async function signIn(formData: FormData) {
  const nextField = formData.get("next");
  const next = safeNextPath(typeof nextField === "string" ? nextField : undefined);
  const parsedEmail = emailSchema.safeParse(formData.get("email"));

  if (!parsedEmail.success) {
    redirect(`/login?error=invalid&next=${encodeURIComponent(next)}`);
  }

  const email = parsedEmail.data;

  // Checked with the service-role client because approved_emails has no
  // anon/authenticated RLS policy — see the migration that created it.
  const serviceRoleClient = createSupabaseServiceRoleClient();
  const { data: approved, error: approvedError } = await serviceRoleClient
    .from("approved_emails")
    .select("email")
    .eq("email", email)
    .maybeSingle();

  if (approvedError) {
    console.error("Failed to check the approved-user list:", approvedError.message);
    redirect(`/login?error=system&next=${encodeURIComponent(next)}`);
  }

  if (!approved) {
    redirect(`/login?error=not-approved&next=${encodeURIComponent(next)}`);
  }

  const supabase = await createSupabaseServerClient();
  const { error: otpError } = await supabase.auth.signInWithOtp({
    email,
    options: {
      // Never silently create a new account. If sign-in is to work for this
      // address, it must already exist as a Supabase auth user, provisioned
      // by `npm run auth:sync-users`.
      shouldCreateUser: false,
      emailRedirectTo: `${env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });

  if (otpError) {
    console.error("Supabase sign-in failed:", otpError.message);
    redirect(`/login?error=system&next=${encodeURIComponent(next)}`);
  }

  redirect(`/login?sent=1`);
}
