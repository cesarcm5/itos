import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { callApi, clientIp, errorResponse } from "@/lib/server/api";
import { SESSION_COOKIE } from "@/lib/session";

// Forwards /api/proxy/<path> to the Express API with the session token as a Bearer header.
async function handler(request: NextRequest, ctx: RouteContext<"/api/proxy/[...path]">) {
  const { path } = await ctx.params;
  if (path.some((segment) => segment === "." || segment === "..")) {
    return errorResponse(400, "VALIDATION_ERROR", "Invalid path");
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) {
    return errorResponse(401, "UNAUTHORIZED", "Not signed in");
  }

  const target = `/${path.map(encodeURIComponent).join("/")}${request.nextUrl.search}`;
  const hasBody = request.method !== "GET" && request.method !== "HEAD";
  const contentType = request.headers.get("content-type");

  let res: Response;
  try {
    res = await callApi(target, {
      method: request.method,
      headers: contentType ? { "content-type": contentType } : undefined,
      body: hasBody ? await request.text() : undefined,
      token,
      ip: clientIp(request),
    });
  } catch {
    return errorResponse(502, "UPSTREAM_ERROR", "API unreachable");
  }

  if (res.status === 401) {
    cookieStore.delete(SESSION_COOKIE);
  }

  const headers = new Headers();
  for (const name of ["content-type", "retry-after"]) {
    const value = res.headers.get(name);
    if (value) headers.set(name, value);
  }
  return new Response(res.status === 204 ? null : res.body, { status: res.status, headers });
}

export { handler as GET, handler as POST, handler as PUT, handler as PATCH, handler as DELETE };
