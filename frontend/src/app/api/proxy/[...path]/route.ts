import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { callApi, clientIp, errorResponse } from "@/lib/server/api";
import { clearSessionCookies, refreshSession } from "@/lib/server/session";
import { SESSION_COOKIE } from "@/lib/session";

function notSignedIn(): Response {
  return errorResponse(401, "UNAUTHORIZED", "Not signed in");
}

function unreachable(): Response {
  return errorResponse(502, "UPSTREAM_ERROR", "API unreachable");
}

// Forwards /api/proxy/<path> to the Express API with the session token as a Bearer header.
// A missing or rejected access token is refreshed once with the refresh cookie, then retried.
async function handler(request: NextRequest, ctx: RouteContext<"/api/proxy/[...path]">) {
  const { path } = await ctx.params;
  if (path.some((segment) => segment === "." || segment === "..")) {
    return errorResponse(400, "VALIDATION_ERROR", "Invalid path");
  }

  const cookieStore = await cookies();
  const ip = clientIp(request);

  let token = cookieStore.get(SESSION_COOKIE)?.value;
  let refreshed = false;
  if (!token) {
    const result = await refreshSession(cookieStore, ip);
    if (result.kind === "expired") return notSignedIn();
    if (result.kind === "error") return unreachable();
    token = result.token;
    refreshed = true;
  }

  const target = `/${path.map(encodeURIComponent).join("/")}${request.nextUrl.search}`;
  const hasBody = request.method !== "GET" && request.method !== "HEAD";
  const contentType = request.headers.get("content-type");
  // Read once: the body may be sent twice if the token is refreshed.
  const body = hasBody ? await request.text() : undefined;

  const send = (bearer: string) =>
    callApi(target, {
      method: request.method,
      headers: contentType ? { "content-type": contentType } : undefined,
      body,
      token: bearer,
      ip,
    });

  let res: Response;
  try {
    res = await send(token);
    if (res.status === 401 && !refreshed) {
      const result = await refreshSession(cookieStore, ip);
      if (result.kind === "expired") return notSignedIn();
      if (result.kind === "error") return unreachable();
      res = await send(result.token);
    }
  } catch {
    return unreachable();
  }

  if (res.status === 401) {
    clearSessionCookies(cookieStore);
  }

  const headers = new Headers();
  for (const name of ["content-type", "retry-after"]) {
    const value = res.headers.get(name);
    if (value) headers.set(name, value);
  }
  return new Response(res.status === 204 ? null : res.body, { status: res.status, headers });
}

export { handler as GET, handler as POST, handler as PUT, handler as PATCH, handler as DELETE };
