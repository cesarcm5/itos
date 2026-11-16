import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { loginSchema, registerSchema } from "@/lib/schemas/auth";
import { callApi, clientIp, errorResponse } from "@/lib/server/api";
import { clearSessionCookies, setSessionCookies } from "@/lib/server/session";
import { REFRESH_COOKIE } from "@/lib/session";

type AuthApiResponse = {
  token: string;
  refreshToken: string;
  user: { id: string; email: string; createdAt: string };
};

function postJson(path: string, body: unknown, request: NextRequest): Promise<Response> {
  return callApi(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    ip: clientIp(request),
  });
}

/** Only relative, same-origin paths: blocks open redirects like //evil.com. */
function safeNext(value: unknown): string | null {
  return typeof value === "string" && /^\/(?!\/)/.test(value) && !value.includes("\\") ? value : null;
}

async function upstreamError(res: Response): Promise<Response> {
  const body: unknown = await res.json().catch(() => null);
  if (body && typeof body === "object" && "error" in body) {
    return Response.json(body, { status: res.status });
  }
  return errorResponse(502, "UPSTREAM_ERROR", "Unexpected response from API");
}

/** Where to go after authenticating: no profile → onboarding, otherwise dashboard (or `next`). */
async function resolveRedirect(token: string, next: string | null): Promise<string> {
  try {
    const res = await callApi("/profile", { token });
    if (res.ok) return next ?? "/dashboard";
  } catch {
    // Fall through to onboarding; it loads the profile again anyway.
  }
  return "/onboarding";
}

export async function POST(request: NextRequest, ctx: RouteContext<"/api/auth/[action]">) {
  const { action } = await ctx.params;
  const cookieStore = await cookies();

  if (action === "logout") {
    const refreshToken = cookieStore.get(REFRESH_COOKIE)?.value;
    clearSessionCookies(cookieStore);
    // Best effort: the cookies are gone either way.
    if (refreshToken) await postJson("/auth/logout", { refreshToken }, request).catch(() => null);
    return new Response(null, { status: 204 });
  }

  if (action !== "login" && action !== "register") {
    return errorResponse(404, "NOT_FOUND", "Route not found");
  }

  const raw: unknown = await request.json().catch(() => null);
  const schema = action === "login" ? loginSchema : registerSchema;
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return errorResponse(400, "VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid input");
  }

  let res: Response;
  try {
    res = await postJson(`/auth/${action}`, parsed.data, request);
  } catch {
    return errorResponse(502, "UPSTREAM_ERROR", "API unreachable");
  }

  if (!res.ok) return upstreamError(res);

  const { token, refreshToken, user } = (await res.json()) as AuthApiResponse;
  setSessionCookies(cookieStore, { token, refreshToken });

  const next = raw && typeof raw === "object" && "next" in raw ? safeNext(raw.next) : null;
  const redirectTo = action === "register" ? "/onboarding" : await resolveRedirect(token, next);

  return Response.json({ user, redirectTo });
}
