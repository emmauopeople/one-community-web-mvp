import { query } from "../../db.js";

export async function logAuthEvent({
  userId = null,
  email = null,
  eventType,
  success,
  req,
  details = {},
}) {
  const ip =
    req.headers["x-forwarded-for"]?.toString().split(",")[0]?.trim() ||
    req.socket.remoteAddress ||
    null;
  const userAgent = req.headers["user-agent"] || null;

  await query(
    `INSERT INTO auth_logs (user_id, email, event_type, success, ip, user_agent, details)
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)`,
    [userId, email, eventType, success, ip, userAgent, JSON.stringify(details)],
  );
}
