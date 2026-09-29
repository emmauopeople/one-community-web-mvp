import { query } from "../../db.js";

function getIp(req) {
  return (
    req.headers["x-forwarded-for"]?.toString().split(",")[0]?.trim() ||
    req.socket.remoteAddress ||
    null
  );
}

export async function logEvent({
  req,
  eventType,
  userId = null,
  skillId = null,
  meta = {},
}) {
  const ip = getIp(req);
  const userAgent = req.headers["user-agent"] || null;

  // Accept both camelCase and snake_case from the frontend
  const resolvedSkillId = skillId ?? meta.skillId ?? meta.skill_id ?? null;

  const {
    country = null,
    region = null,
    city = null,
    category = null,
    q = null,
    channel = null,
    lat = null,
    lng = null,
    radius_km = null,
  } = meta;

  // Optional light dedupe for accidental duplicate skill views in dev/strict mode
  if (eventType === "skill_view" && resolvedSkillId) {
    const existing = await query(
      `SELECT id
       FROM events
       WHERE event_type = $1
         AND skill_id = $2
         AND COALESCE(user_id, -1) = COALESCE($3, -1)
         AND occurred_at > NOW() - INTERVAL '5 seconds'
       LIMIT 1`,
      [eventType, resolvedSkillId, userId],
    );

    if (existing.rows.length > 0) {
      return;
    }
  }

  await query(
    `INSERT INTO events
     (event_type, user_id, skill_id, country, region, city, category, q, channel, lat, lng, radius_km, ip, user_agent)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
    [
      eventType,
      userId,
      resolvedSkillId,
      country,
      region,
      city,
      category,
      q,
      channel,
      lat,
      lng,
      radius_km,
      ip,
      userAgent,
    ],
  );
}
