import "server-only";
import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

/**
 * Service-role Supabase client. Bypasses row-level security, so it exists
 * only for narrow, explicitly server-side uses: checking the approved-emails
 * allow-list during sign-in, and scripts/sync-approved-users.mjs. Never wire
 * this into anything a "use client" component can reach.
 */
export function createSupabaseServiceRoleClient() {
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
