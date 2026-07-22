import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

function requireSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    // Middleware runs before src/instrumentation.ts on some platforms, so it
    // repeats the same clear failure rather than risking a request that
    // silently treats everyone as signed out (or worse, signed in).
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. Copy " +
        ".env.example to .env.local and fill in real Supabase project credentials.",
    );
  }

  return { url, anonKey };
}

/**
 * Refreshes the Supabase session cookie on every request and guards
 * /admin and /login. Scoped to just those two paths by the matcher in
 * src/middleware.ts.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { url, anonKey } = requireSupabaseConfig();

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  // getUser() re-validates the session against Supabase Auth rather than
  // trusting the local cookie, so a revoked or expired session is caught
  // here instead of only on the next data fetch.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAdminRoute = request.nextUrl.pathname.startsWith("/admin");
  const isLoginRoute = request.nextUrl.pathname.startsWith("/login");

  if (isAdminRoute && !user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isLoginRoute && user) {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  return response;
}
