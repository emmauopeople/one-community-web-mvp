import express from "express";
import { query } from "../../db.js";
import { requireAuth, requireRole } from "../middleware/requireAuth.js";
import { logEvent } from "../services/eventService.js";
import { presignGet } from "../services/s3.js";

import { hasLocationConsent } from "../services/providerLocation.js";
const router = express.Router();

/** -------------------------
 * Helpers
 * ------------------------*/
const norm = (v) => String(v || "").trim();
const normLower = (v) =>
  String(v || "")
    .trim()
    .toLowerCase();

const toNum = (v) => {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

function validateLatLng(lat, lng) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng))
    return "Latitude/Longitude must be numbers.";
  if (lat < -90 || lat > 90) return "Latitude must be between -90 and 90.";
  if (lng < -180 || lng > 180) return "Longitude must be between -180 and 180.";
  return null;
}

/** -------------------------
 * Index images (thumbnails)
 * - signs first available image per skill (sort_order ASC)
 * ------------------------*/
async function attachIndexImages(rows) {
  const bucket = process.env.S3_BUCKET;
  const expiresIn = Number(process.env.S3_PRESIGN_EXPIRES_SECONDS || 300);

  if (!bucket || !Array.isArray(rows) || rows.length === 0) return rows;

  const ids = rows.map((r) => Number(r.id)).filter(Boolean);
  if (ids.length === 0) return rows;

  const m = await query(
    `SELECT DISTINCT ON (skill_id) skill_id, s3_key
     FROM skill_media
     WHERE skill_id = ANY($1::bigint[])
     ORDER BY skill_id, sort_order ASC`,
    [ids],
  );

  const map = new Map(m.rows.map((x) => [Number(x.skill_id), x.s3_key]));

  for (const r of rows) {
    const key = map.get(Number(r.id));
    if (!key) {
      r.indexImageUrl = null;
      continue;
    }
    try {
      r.indexImageUrl = await presignGet({ bucket, key, expiresIn });
    } catch {
      r.indexImageUrl = null;
    }
  }
  return rows;
}

async function providerMustBeActive(providerId) {
  const r = await query(
    `SELECT status, operating_location, gps_consent_at, gps_consent_version, gps_consent_withdrawn_at FROM users WHERE id=$1 AND role='provider'`,
    [providerId],
  );
  const u = r.rows[0];
  if (!u) return { ok: false, code: 404, error: "Provider not found" };
  if (u.status !== "active")
    return { ok: false, code: 403, error: "Provider is inactive" };
  if (!hasLocationConsent(u))
    return {
      ok: false,
      code: 403,
      error:
        "Complete GPS consent and operating location in your provider profile first.",
    };
  return { ok: true, location: u.operating_location };
}

/** -------------------------
 * Provider: Skills CRUD
 * ------------------------*/
router.post(
  "/provider/skills",
  requireAuth,
  requireRole("provider"),
  async (req, res) => {
    try {
      const providerId = req.session.user.id;

      const gate = await providerMustBeActive(providerId);
      if (!gate.ok) return res.status(gate.code).json({ error: gate.error });

      const title = norm(req.body.title);
      const category = norm(req.body.category);
      const tags = norm(req.body.tags);
      const description = norm(req.body.description);

      const selectedLocation =
        req.body.locationSource === "edited_for_listing"
          ? req.body
          : gate.location;
      const country = norm(selectedLocation.country);
      const region = norm(selectedLocation.region);
      const city = norm(selectedLocation.city);
      const area = norm(selectedLocation.area);

      const lat = toNum(selectedLocation.lat);
      const lng = toNum(selectedLocation.lng);

      if (!title || !category || !description)
        return res.status(400).json({ error: "Missing required fields." });
      if (!country || !region || !city)
        return res
          .status(400)
          .json({ error: "Country, region, and city are required." });

      const llErr = validateLatLng(lat, lng);
      if (llErr) return res.status(400).json({ error: llErr });

      const r = await query(
        `INSERT INTO skills
       (provider_id, title, category, tags, description, country, region, city, area, lat, lng, status, division, subdivision, location_source)
       VALUES
       ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'active',$12,$13,$14)
       RETURNING id, title, category, tags, description, country, region, city, area, lat, lng, status, created_at, updated_at`,
        [
          providerId,
          title,
          category,
          tags,
          description,
          country,
          region,
          city,
          area,
          lat,
          lng,
          norm(selectedLocation.division),
          norm(selectedLocation.subdivision),
          req.body.locationSource === "edited_for_listing"
            ? "edited_for_listing"
            : "provider_profile",
        ],
      );

      return res.status(201).json({ skill: r.rows[0] });
    } catch (e) {
      console.error("CREATE SKILL ERROR:", e);
      return res.status(500).json({ error: "Failed to create skill" });
    }
  },
);

router.get(
  "/provider/skills",
  requireAuth,
  requireRole("provider"),
  async (req, res) => {
    try {
      const providerId = req.session.user.id;

      const r = await query(
        `SELECT id, title, category, tags, description, country, region, city, area, lat, lng, status, created_at, updated_at
       FROM skills
       WHERE provider_id=$1
       ORDER BY created_at DESC`,
        [providerId],
      );

      await attachIndexImages(r.rows);
      return res.json({ skills: r.rows });
    } catch (e) {
      console.error("PROVIDER LIST SKILLS ERROR:", e);
      return res.status(500).json({ error: "Failed to load skills" });
    }
  },
);

router.put(
  "/provider/skills/:id",
  requireAuth,
  requireRole("provider"),
  async (req, res) => {
    try {
      const providerId = req.session.user.id;

      const gate = await providerMustBeActive(providerId);
      if (!gate.ok) return res.status(gate.code).json({ error: gate.error });

      const skillId = Number(req.params.id);
      if (!skillId) return res.status(400).json({ error: "Invalid skill id" });

      const owned = await query(
        `SELECT id,location_source FROM skills WHERE id=$1 AND provider_id=$2`,
        [skillId, providerId],
      );
      if (owned.rowCount === 0)
        return res.status(404).json({ error: "Skill not found" });

      const title = norm(req.body.title);
      const category = norm(req.body.category);
      const tags = norm(req.body.tags);
      const description = norm(req.body.description);

      const selectedLocation =
        req.body.locationSource === "provider_profile"
          ? gate.location
          : req.body;
      const country = norm(selectedLocation.country);
      const region = norm(selectedLocation.region);
      const city = norm(selectedLocation.city);
      const area = norm(selectedLocation.area);

      const lat = toNum(selectedLocation.lat);
      const lng = toNum(selectedLocation.lng);

      if (!title || !category || !description)
        return res.status(400).json({ error: "Missing required fields." });
      if (!country || !region || !city)
        return res
          .status(400)
          .json({ error: "Country, region, and city are required." });

      const llErr = validateLatLng(lat, lng);
      if (llErr) return res.status(400).json({ error: llErr });

      const r = await query(
        `UPDATE skills
       SET title=$3, category=$4, tags=$5, description=$6,
           country=$7, region=$8, city=$9, area=$10, lat=$11, lng=$12,
           division=COALESCE($13,division), subdivision=COALESCE($14,subdivision), location_source=$15,
           updated_at=NOW()
       WHERE id=$1 AND provider_id=$2
       RETURNING id, title, category, tags, description, country, region, city, area, lat, lng, status, created_at, updated_at`,
        [
          skillId,
          providerId,
          title,
          category,
          tags,
          description,
          country,
          region,
          city,
          area,
          lat,
          lng,
          selectedLocation.division ?? null,
          selectedLocation.subdivision ?? null,
          req.body.locationSource || owned.rows[0].location_source,
        ],
      );

      return res.json({ skill: r.rows[0] });
    } catch (e) {
      console.error("UPDATE SKILL ERROR:", e);
      return res.status(500).json({ error: "Failed to update skill" });
    }
  },
);

router.delete(
  "/provider/skills/:id",
  requireAuth,
  requireRole("provider"),
  async (req, res) => {
    try {
      const providerId = req.session.user.id;
      const skillId = Number(req.params.id);
      if (!skillId) return res.status(400).json({ error: "Invalid skill id" });

      const r = await query(
        `DELETE FROM skills WHERE id=$1 AND provider_id=$2`,
        [skillId, providerId],
      );
      if (r.rowCount === 0)
        return res.status(404).json({ error: "Skill not found" });

      return res.json({ ok: true });
    } catch (e) {
      console.error("DELETE SKILL ERROR:", e);
      return res.status(500).json({ error: "Failed to delete skill" });
    }
  },
);

/** -------------------------
 * Public: Search (case-insensitive; supports country, region, city, area, category, q, and GPS)
 * ------------------------*/
/** -------------------------
 * Public: Skill detail (modal)
 * Returns: { skill, media: [{ sortOrder, mimeType, url }] }
 * ------------------------*/
router.get("/skills/:id", async (req, res) => {
  try {
    const skillId = Number(req.params.id);
    if (!skillId) return res.status(400).json({ error: "Invalid skill id" });

    const s = await query(
      `SELECT
        s.id, s.title, s.category, s.tags, s.description,
        s.country, s.region, s.city, s.area, s.created_at,
        u.id AS provider_id, u.email AS provider_email, u.phone AS provider_phone, u.display_name
       FROM skills s
       JOIN users u ON u.id = s.provider_id
       WHERE s.id=$1
         AND s.status='active'
         AND u.status='active'
         AND u.role='provider' AND u.gps_consent_at IS NOT NULL AND u.gps_consent_version='provider-gps-v1.2' AND u.gps_consent_withdrawn_at IS NULL`,
      [skillId],
    );

    if (s.rowCount === 0)
      return res.status(404).json({ error: "Skill not found" });

    const bucket = process.env.S3_BUCKET;
    const expiresIn = Number(process.env.S3_PRESIGN_EXPIRES_SECONDS || 300);

    const mediaRows = await query(
      `SELECT s3_key, mime_type, size_bytes, sort_order
       FROM skill_media
       WHERE skill_id=$1
       ORDER BY sort_order ASC`,
      [skillId],
    );

    const media = [];
    if (bucket) {
      for (const m of mediaRows.rows) {
        try {
          const url = await presignGet({ bucket, key: m.s3_key, expiresIn });
          media.push({
            sortOrder: m.sort_order,
            mimeType: m.mime_type,
            sizeBytes: m.size_bytes,
            url,
          });
        } catch {
          // skip bad keys
        }
      }
    }

    // Best-effort event log
    try {
      const userId = req.session?.user?.id || null;
      await logEvent({
        req,
        eventType: "skill_view",
        userId,
        meta: { skillId },
      });
    } catch {}

    return res.json({ skill: s.rows[0], media });
  } catch (e) {
    console.error("SKILL DETAIL ERROR:", e);
    return res.status(500).json({ error: "Failed to load skill" });
  }
});

export default router;
