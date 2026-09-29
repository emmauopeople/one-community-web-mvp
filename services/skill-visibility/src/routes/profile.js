import express from "express";
import { query } from "../../db.js";
import { requireAuth, requireRole } from "../middleware/requireAuth.js";
import { logAuthEvent } from "../services/authLogService.js";

const router = express.Router();

const clean = (v) => String(v || "").trim();

function validDisplayName(s) {
  if (!s) return true; // allow empty (optional)
  return s.length >= 2 && s.length <= 60;
}

function validPhone(s) {
  if (!s) return false; // phone is required in your schema
  return /^[+]?[0-9]{8,15}$/.test(s);
}

// GET /providers/:providerId/public
// Public provider profile for service-discovery clients.
router.get("/providers/:providerId/public", async (req, res) => {
  try {
    const providerId = Number(req.params.providerId);
    if (!providerId) return res.status(400).json({ error: "Invalid provider id" });

    const r = await query(
      `SELECT id, email, phone, role, status, display_name, created_at, updated_at
       FROM users
       WHERE id=$1 AND role='provider' AND status='active'`,
      [providerId],
    );

    if (r.rowCount === 0)
      return res.status(404).json({ error: "Provider not found" });

    return res.json({ provider: r.rows[0] });
  } catch (e) {
    console.error("PUBLIC PROVIDER PROFILE ERROR:", e);
    return res.status(500).json({ error: "Failed to load provider profile" });
  }
});

// GET /provider/profile
router.get(
  "/provider/profile",
  requireAuth,
  requireRole("provider"),
  async (req, res) => {
    const userId = req.session.user.id;

    const r = await query(
      `SELECT id, email, phone, role, status, display_name, created_at, updated_at
     FROM users
     WHERE id=$1 AND role='provider'`,
      [userId],
    );

    if (r.rowCount === 0)
      return res.status(404).json({ error: "Provider not found" });

    return res.json({ profile: r.rows[0] });
  },
);

// PUT /provider/profile
router.put(
  "/provider/profile",
  requireAuth,
  requireRole("provider"),
  async (req, res) => {
    const userId = req.session.user.id;
    const email = req.session.user.email;

    const displayName = clean(req.body.displayName);
    const phone = clean(req.body.phone).replace(/\s+/g, "");

    if (!validDisplayName(displayName)) {
      return res
        .status(400)
        .json({ error: "Display name must be 2–60 characters." });
    }
    if (!validPhone(phone)) {
      return res.status(400).json({
        error: "Phone must be digits only (optionally +), 8–15 digits.",
      });
    }

    const r = await query(
      `UPDATE users
     SET display_name=$2,
         phone=$3,
         updated_at=NOW()
     WHERE id=$1 AND role='provider'
     RETURNING id, email, phone, role, status, display_name, created_at, updated_at`,
      [userId, displayName || null, phone],
    );

    // Best-effort logging
    try {
      await logAuthEvent({
        userId,
        email,
        eventType: "profile_update",
        success: true,
        req,
      });
    } catch {}

    return res.json({ ok: true, profile: r.rows[0] });
  },
);

export default router;
