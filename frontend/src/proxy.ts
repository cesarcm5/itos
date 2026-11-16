import { NextResponse, type NextRequest } from "next/server";
import { REFRESH_COOKIE, SESSION_COOKIE } from "@/lib/session";

const AUTH_PAGES = ["/login", "/register"];

// Only checks that a session cookie exists. The access cookie lasts 15 min; with just the
// refresh cookie left, /api/proxy refreshes on the first request. A failed refresh clears
// both cookies and sends the user back to /login.
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hasSession = request.cookies.has(SESSION_COOKIE) || request.cookies.has(REFRESH_COOKIE);

  if (AUTH_PAGES.includes(pathname)) {
    return hasSession ? NextResponse.redirect(new URL("/dashboard", request.url)) : NextResponse.next();
  }

  if (!hasSession) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(login);
  }

  return NextResponse.next();
}

export const config = {
  // The (app) route group, plus the auth pages for the signed-in redirect.
  matcher: [
    "/onboarding",
    "/dashboard",
    "/stock/:path*",
    "/simulator",
    "/alerts",
    "/profile",
    "/login",
    "/register",
  ],
};
