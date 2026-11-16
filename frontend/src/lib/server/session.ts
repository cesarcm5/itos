// Server-only: cookie helpers for the route handlers, including the silent refresh.
import type { cookies } from "next/headers";
import { callApi } from "@/lib/server/api";
import {
  REFRESH_COOKIE,
  SESSION_COOKIE,
  refreshCookieOptions,
  sessionCookieOptions,
} from "@/lib/session";

type CookieStore = Awaited<ReturnType<typeof cookies>>;

/** `refreshToken` is absent when the API reused a just-rotated token: keep the current cookie. */
export type SessionTokens = { token: string; refreshToken?: string };

export function setSessionCookies(store: CookieStore, { token, refreshToken }: SessionTokens): void {
  store.set(SESSION_COOKIE, token, sessionCookieOptions);
  if (refreshToken) store.set(REFRESH_COOKIE, refreshToken, refreshCookieOptions);
}

export function clearSessionCookies(store: CookieStore): void {
  store.delete(SESSION_COOKIE);
  store.delete(REFRESH_COOKIE);
}

type RefreshOutcome = { kind: "ok"; tokens: SessionTokens } | { kind: "expired" } | { kind: "error" };

/** The new access token; `expired` (cookies cleared) when the session is over; `error` when the API is down. */
export type RefreshResult = { kind: "ok"; token: string } | { kind: "expired" } | { kind: "error" };

// Parallel requests with the same refresh token share one call, so the API rotates it once.
// Across server instances, the API's 30 s reuse window covers the race.
const inFlight = new Map<string, Promise<RefreshOutcome>>();

async function requestRefresh(refreshToken: string, ip: string | undefined): Promise<RefreshOutcome> {
  try {
    const res = await callApi("/auth/refresh", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ refreshToken }),
      ip,
    });
    // Only a 401 ends the session; a 429 or 5xx keeps the cookies for the next try.
    if (res.status === 401) return { kind: "expired" };
    if (!res.ok) return { kind: "error" };
    const body = (await res.json()) as { token?: unknown; refreshToken?: unknown };
    if (typeof body.token !== "string") return { kind: "error" };
    const next = typeof body.refreshToken === "string" ? body.refreshToken : undefined;
    return { kind: "ok", tokens: { token: body.token, refreshToken: next } };
  } catch {
    return { kind: "error" };
  }
}

/** Exchanges the refresh cookie for a new access token and updates both cookies. */
export async function refreshSession(store: CookieStore, ip: string | undefined): Promise<RefreshResult> {
  const refreshToken = store.get(REFRESH_COOKIE)?.value;
  if (!refreshToken) {
    clearSessionCookies(store);
    return { kind: "expired" };
  }

  let pending = inFlight.get(refreshToken);
  if (!pending) {
    pending = requestRefresh(refreshToken, ip).finally(() => inFlight.delete(refreshToken));
    inFlight.set(refreshToken, pending);
  }

  const outcome = await pending;
  if (outcome.kind === "expired") clearSessionCookies(store);
  if (outcome.kind !== "ok") return outcome;
  setSessionCookies(store, outcome.tokens);
  return { kind: "ok", token: outcome.tokens.token };
}
