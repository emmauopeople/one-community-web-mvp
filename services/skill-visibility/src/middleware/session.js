import cookieSession from "cookie-session";

export function sessionMiddleware() {
  const cookieSecure = process.env.COOKIE_SECURE === "true"; // control explicitly
  return cookieSession({
    name: "session",
    keys: [process.env.SESSION_SECRET],
    httpOnly: true,
    sameSite: "lax",
    secure: cookieSecure,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}
