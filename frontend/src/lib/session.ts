// Shared by proxy.ts and the route handlers. The tokens are never readable from browser JS.
export const SESSION_COOKIE = "itos_session";
export const REFRESH_COOKIE = "itos_refresh";

// Match the API: access JWT 15 min, refresh token 30 days.
export const SESSION_MAX_AGE = 60 * 15;
export const REFRESH_MAX_AGE = 60 * 60 * 24 * 30;

const baseCookieOptions = {
  httpOnly: true,
  // Secure in production; plain http://localhost in development.
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
} as const;

export const sessionCookieOptions = { ...baseCookieOptions, maxAge: SESSION_MAX_AGE } as const;
export const refreshCookieOptions = { ...baseCookieOptions, maxAge: REFRESH_MAX_AGE } as const;
