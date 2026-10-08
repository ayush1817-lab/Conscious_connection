import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/lib/supabase/database.types";
import { isSupabaseConfigured, publicEnv } from "@/lib/env";

// Pages under /admin that work without being logged in.
const PUBLIC_ADMIN_PATHS = ["/admin/login", "/admin/forgot-password", "/admin/reset-password", "/admin/no-access"];

// Sends every page to /setup until Supabase is configured. For /admin it also
// refreshes the Supabase session cookie on every request and guards access:
// logged out -> A0 login; logged in but not an admin -> "You don't have access".
export async function proxy(request: NextRequest) {
  // A deployment without its Supabase settings shows a setup page, not a crash.
  if (!isSupabaseConfigured()) {
    return NextResponse.redirect(new URL("/setup", request.url));
  }

  // The public site and host pages have no logins, so they skip the session work below.
  if (!request.nextUrl.pathname.startsWith("/admin")) return NextResponse.next();

  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    publicEnv.supabaseUrl,
    publicEnv.supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
        },
      },
    },
  );

  // Must run before any redirect so a refreshed session cookie is kept.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_ADMIN_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  const redirectTo = (path: string, keepNext = false) => {
    const url = request.nextUrl.clone();
    url.pathname = path;
    url.search = "";
    if (keepNext && pathname !== "/admin") url.searchParams.set("next", pathname + request.nextUrl.search);
    const redirect = NextResponse.redirect(url);
    for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie);
    return redirect;
  };

  if (!user) {
    return isPublic ? response : redirectTo("/admin/login", true);
  }

  if (pathname === "/admin/reset-password") return response;

  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) {
    return pathname === "/admin/no-access" ? response : redirectTo("/admin/no-access");
  }

  // Admins don't need the login, forgot-password or no-access pages.
  if (isPublic) return redirectTo("/admin");
  return response;
}

export const config = {
  // Everything except Next.js internals, static files and the setup page itself.
  matcher: ["/((?!_next/|setup|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:png|jpg|jpeg|svg|webp|ico)$).*)"],
};
