import { query } from "../../db.js";

const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

export async function getLoginAttempt(email) {
  const r = await query(`SELECT * FROM login_attempts WHERE email = $1`, [
    email,
  ]);
  return r.rows[0] || null;
}

export async function recordLoginFailure({ email, req }) {
  const ip =
    req.headers["x-forwarded-for"]?.toString().split(",")[0]?.trim() ||
    req.socket.remoteAddress ||
    null;
  const userAgent = req.headers["user-agent"] || null;

  const existing = await getLoginAttempt(email);
  const now = new Date();

  if (!existing) {
    await query(
      `INSERT INTO login_attempts (email, failed_attempts, first_failed_at, last_failed_at, last_ip, last_user_agent)
       VALUES ($1, 1, NOW(), NOW(), $2, $3)`,
      [email, ip, userAgent],
    );
    return { locked: false };
  }

  // If currently locked, keep it locked
  if (existing.locked_until && new Date(existing.locked_until) > now) {
    return { locked: true, lockedUntil: existing.locked_until };
  }

  const failedAttempts = Number(existing.failed_attempts || 0) + 1;
  let lockedUntil = null;

  if (failedAttempts >= MAX_ATTEMPTS) {
    lockedUntil = new Date(now.getTime() + LOCK_MINUTES * 60 * 1000);
  }

  await query(
    `UPDATE login_attempts
     SET failed_attempts=$2,
         last_failed_at=NOW(),
         locked_until=$3,
         last_ip=$4,
         last_user_agent=$5,
         updated_at=NOW()
     WHERE email=$1`,
    [email, failedAttempts, lockedUntil, ip, userAgent],
  );

  return { locked: Boolean(lockedUntil), lockedUntil };
}

export async function resetLoginAttempts(email) {
  await query(`DELETE FROM login_attempts WHERE email = $1`, [email]);
}
