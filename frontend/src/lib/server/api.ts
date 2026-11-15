// Server-only: never import from a client component. API_URL is not exposed to the browser.

export type ApiErrorBody = {
  error: { code: string; message: string; retryAfter?: number };
};

function apiUrl(): string {
  const url = process.env.API_URL;
  if (!url) throw new Error("API_URL is not set");
  return url.replace(/\/+$/, "");
}

/** Client IP to forward, so the API's per-IP rate limit isn't shared by every user. */
export function clientIp(request: Request): string | undefined {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || undefined;
}

export async function callApi(
  path: string,
  init: RequestInit & { token?: string; ip?: string } = {},
): Promise<Response> {
  const { token, ip, headers, ...rest } = init;
  const outgoing = new Headers(headers);
  outgoing.set("accept", "application/json");
  if (token) outgoing.set("authorization", `Bearer ${token}`);
  if (ip) outgoing.set("x-forwarded-for", ip);

  return fetch(`${apiUrl()}${path}`, { ...rest, headers: outgoing, cache: "no-store" });
}

export function errorResponse(status: number, code: string, message: string): Response {
  const body: ApiErrorBody = { error: { code, message } };
  return Response.json(body, { status });
}
