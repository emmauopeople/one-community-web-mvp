import express from "express";
import { query } from "../../db.js";
import { requireAuth, requireRole } from "../middleware/requireAuth.js";
import { logAuthEvent } from "../services/authLogService.js";

import {
  validateOnboarding,
  CONSENT_VERSION,
} from "../services/providerLocation.js";
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
    if (!providerId)
      return res.status(400).json({ error: "Invalid provider id" });

    const r = await query(
      `SELECT id, email, phone, role, status, display_name, created_at, updated_at
       FROM users
       WHERE id=$1 AND role='provider' AND status='active' AND gps_consent_at IS NOT NULL AND gps_consent_version='provider-gps-v1.2' AND gps_consent_withdrawn_at IS NULL`,
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
      `SELECT id, email, phone, role, status, display_name, created_at, updated_at, operating_location, gps_consent_at, gps_consent_version, gps_consent_withdrawn_at
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

router.put(
  "/provider/location",
  requireAuth,
  requireRole("provider"),
  async (req, res) => {
    let location;
    try {
      location = validateOnboarding(req.body);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
    try {
      const result = await query(
        `WITH changed AS (
      UPDATE users SET operating_location=$2::jsonb, gps_consent_at=NOW(),
        gps_consent_version=$3, gps_consent_withdrawn_at=NULL, updated_at=NOW()
      WHERE id=$1 AND role='provider' RETURNING id, operating_location, gps_consent_at, gps_consent_version
    ), audit AS (
      INSERT INTO provider_location_audit(provider_id,action,consent_version)
      SELECT id,'updated',$3 FROM changed
    ) SELECT * FROM changed`,
        [req.session.user.id, JSON.stringify(location), CONSENT_VERSION],
      );
      if (!result.rows.length)
        return res.status(404).json({ error: "Provider not found" });
      return res.json({ profile: result.rows[0] });
    } catch {
      return res
        .status(500)
        .json({ error: "Unable to save operating location." });
    }
  },
);

router.delete(
  "/provider/location/consent",
  requireAuth,
  requireRole("provider"),
  async (req, res) => {
    try {
      await query(
        `WITH changed AS (
      UPDATE users SET gps_consent_withdrawn_at=NOW() WHERE id=$1 AND role='provider' RETURNING id
    ) INSERT INTO provider_location_audit(provider_id,action,consent_version)
      SELECT id,'withdrawn',$2 FROM changed`,
        [req.session.user.id, CONSENT_VERSION],
      );
      res.json({ ok: true });
    } catch {
      res.status(500).json({ error: "Unable to withdraw consent." });
    }
  },
);

export default router;
