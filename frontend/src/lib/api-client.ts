// Browser-side fetch for the app. Everything goes through /api/proxy; the token stays in the httpOnly cookie.

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly retryAfter?: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function toApiError(res: Response): Promise<ApiError> {
  const body: unknown = await res.json().catch(() => null);
  if (body && typeof body === "object" && "error" in body && body.error && typeof body.error === "object") {
    const { code, message, retryAfter } = body.error as { code?: unknown; message?: unknown; retryAfter?: unknown };
    return new ApiError(
      res.status,
      typeof code === "string" ? code : "INTERNAL_ERROR",
      typeof message === "string" ? message : res.statusText,
      typeof retryAfter === "number" ? retryAfter : undefined,
    );
  }
  return new ApiError(res.status, "INTERNAL_ERROR", res.statusText);
}

function redirectToLogin(): never {
  const next = `${window.location.pathname}${window.location.search}`;
  // Full reload on purpose: drops all cached client data from the old session.
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  window.location.assign(`/login?next=${encodeURIComponent(next)}`);
  throw new ApiError(401, "UNAUTHORIZED", "Session expired");
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`/api/proxy${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...init.headers },
  });

  // The proxy already cleared the cookie.
  if (res.status === 401) redirectToLogin();
  if (!res.ok) throw await toApiError(res);
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export async function logout(): Promise<void> {
  await fetch("/api/auth/logout", { method: "POST" });
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  window.location.assign("/login");
}
