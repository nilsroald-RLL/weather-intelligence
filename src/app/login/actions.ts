"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
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
  const passwordField = formData.get("password");

  if (!parsedEmail.success || typeof passwordField !== "string" || passwordField.length === 0) {
    redirect(`/login?error=invalid&next=${encodeURIComponent(next)}`);
  }

  const email = parsedEmail.data;
  const password = passwordField;

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
  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

  if (signInError) {
    // Deliberately one generic message for both "no such user" and "wrong
    // password" — distinguishing them would let a caller probe which
    // approved addresses have a password set yet.
    console.error("Supabase sign-in failed:", signInError.message);
    redirect(`/login?error=invalid-credentials&next=${encodeURIComponent(next)}`);
  }

  redirect(next);
}
