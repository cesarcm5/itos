import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/session";

const AUTH_PAGES = ["/login", "/register"];

// Only checks that the cookie exists; the API validates the token, and any 401
// from /api/proxy clears the cookie and sends the user back to /login.
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hasSession = request.cookies.has(SESSION_COOKIE);

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
