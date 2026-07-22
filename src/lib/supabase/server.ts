import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { env } from "@/lib/env";

/**
 * Cookie-bound Supabase client for Server Components, Server Actions, and
 * Route Handlers. Reads and writes the session cookie so `auth.getUser()`
 * reflects whoever is signed in on the current request.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Called from a Server Component, which can't set cookies. The
          // session is refreshed in src/middleware.ts instead, so this is
          // safe to ignore.
        }
      },
    },
  });
}
