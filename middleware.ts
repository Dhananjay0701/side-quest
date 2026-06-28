import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { canAccessStudio, fetchProfileRoleByAuthUserId } from "@/lib/auth/roles-edge";

const PROTECTED_API_PREFIXES = ["/api/import", "/api/collections/", "/api/studio/"];
const PROTECTED_API_EXACT: { method: string; path: string }[] = [
  { method: "POST", path: "/api/places" },
  { method: "POST", path: "/api/collections" },
];
const PROTECTED_PAGE_PREFIXES = ["/studio"];
const AUTH_USER_ID_HEADER = "x-auth-user-id";
const AUTH_USER_ID_COOKIE = "rsq-auth-uid";

export async function middleware(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  let supabaseResponse = NextResponse.next({
    request: { headers: requestHeaders },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request: { headers: requestHeaders },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user?.id) {
    requestHeaders.set(AUTH_USER_ID_HEADER, user.id);
    const nextResponse = NextResponse.next({
      request: { headers: requestHeaders },
    });
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      nextResponse.cookies.set(cookie);
    });
    nextResponse.cookies.set(AUTH_USER_ID_COOKIE, user.id, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24,
    });
    supabaseResponse = nextResponse;
  } else {
    requestHeaders.delete(AUTH_USER_ID_HEADER);
    supabaseResponse.cookies.delete(AUTH_USER_ID_COOKIE);
  }

  const { pathname } = request.nextUrl;
  const isProtectedApi =
    (request.method !== "GET" &&
      PROTECTED_API_PREFIXES.some((prefix) => pathname.startsWith(prefix))) ||
    PROTECTED_API_EXACT.some(
      (route) => route.method === request.method && pathname === route.path
    );

  const isProtectedStudioApi = pathname.startsWith("/api/studio/");
  const isProtectedStudioPage = PROTECTED_PAGE_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix)
  );

  if ((isProtectedApi || isProtectedStudioApi || isProtectedStudioPage) && !user) {
    if (isProtectedStudioPage) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/login";
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }

    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Sign in required" } },
      { status: 401 }
    );
  }

  if (user && (isProtectedStudioApi || isProtectedStudioPage)) {
    const role = await fetchProfileRoleByAuthUserId(user.id);
    if (!role || !canAccessStudio(role)) {
      if (isProtectedStudioPage) {
        const homeUrl = request.nextUrl.clone();
        homeUrl.pathname = "/";
        homeUrl.search = "";
        return NextResponse.redirect(homeUrl);
      }

      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Studio access required" } },
        { status: 403 }
      );
    }
  }

  if (process.env.DEBUG_PROFILING === "true") {
    supabaseResponse.headers.set("x-request-id", Math.random().toString(16).slice(2, 8));
    supabaseResponse.headers.set("x-pathname", pathname);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|cdn/|debug/|api/debug/|images_to_use|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
