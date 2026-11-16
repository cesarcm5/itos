// Shared by proxy.ts and the route handlers. The token itself is never readable from browser JS.
export const SESSION_COOKIE = "itos_session";

// Matches the API's JWT lifetime (24 h).
export const SESSION_MAX_AGE = 60 * 60 * 24;

export const sessionCookieOptions = {
  httpOnly: true,
  // Secure in production; plain http://localhost in development.
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
  maxAge: SESSION_MAX_AGE,
} as const;
