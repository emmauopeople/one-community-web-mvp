import express from "express";
import { query } from "../../db.js";
import { requireAuth, requireRole } from "../middleware/requireAuth.js";
import { logEvent } from "../services/eventService.js";
import { presignGet } from "../services/s3.js";

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
    `SELECT status FROM users WHERE id=$1 AND role='provider'`,
    [providerId],
  );
  const u = r.rows[0];
  if (!u) return { ok: false, code: 404, error: "Provider not found" };
  if (u.status !== "active")
    return { ok: false, code: 403, error: "Provider is inactive" };
  return { ok: true };
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

      const country = norm(req.body.country);
      const region = norm(req.body.region);
      const city = norm(req.body.city);
      const area = norm(req.body.area);

      const lat = toNum(req.body.lat);
      const lng = toNum(req.body.lng);

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
       (provider_id, title, category, tags, description, country, region, city, area, lat, lng, status)
       VALUES
       ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'active')
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
        `SELECT id FROM skills WHERE id=$1 AND provider_id=$2`,
        [skillId, providerId],
      );
      if (owned.rowCount === 0)
        return res.status(404).json({ error: "Skill not found" });

      const title = norm(req.body.title);
      const category = norm(req.body.category);
      const tags = norm(req.body.tags);
      const description = norm(req.body.description);

      const country = norm(req.body.country);
      const region = norm(req.body.region);
      const city = norm(req.body.city);
      const area = norm(req.body.area);

      const lat = toNum(req.body.lat);
      const lng = toNum(req.body.lng);

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
router.get("/skills/search", async (req, res) => {
  try {
    const country = normLower(req.query.country);
    const region = normLower(req.query.region);
    const city = normLower(req.query.city);
    const area = normLower(req.query.area);

    // MUTUAL EXCLUSIVE (backend-safe):
    // if q present -> ignore category
    const q = norm(req.query.q);
    const category = q ? "" : normLower(req.query.category);

    const lat = toNum(req.query.lat);
    const lng = toNum(req.query.lng);
    const radiusKm = toNum(req.query.radius_km);

    const params = [];
    let where = `
      WHERE s.status='active'
        AND u.status='active'
        AND u.role='provider'
    `;

    if (country) {
      params.push(country);
      where += ` AND LOWER(s.country) = $${params.length}`;
    }
    if (region) {
      params.push(region);
      where += ` AND LOWER(s.region) = $${params.length}`;
    }
    if (city) {
      params.push(city);
      where += ` AND LOWER(s.city) = $${params.length}`;
    }
    if (area) {
      params.push(`%${area}%`);
      where += ` AND LOWER(s.area) LIKE $${params.length}`;
    }
    if (category) {
      params.push(category);
      where += ` AND LOWER(s.category) = $${params.length}`;
    }

    if (q) {
      params.push(`%${q}%`);
      const p = `$${params.length}`;
      where += ` AND (s.title ILIKE ${p} OR s.description ILIKE ${p} OR s.tags ILIKE ${p} OR s.area ILIKE ${p} OR s.city ILIKE ${p} OR s.region ILIKE ${p})`;
    }

    const hasGeo = Number.isFinite(lat) && Number.isFinite(lng);

    let sql;

    if (hasGeo) {
      const latParam = params.length + 1;
      const lngParam = params.length + 2;

      params.push(lat, lng);

      const distanceExpr = `
        (6371 * 2 * ASIN(SQRT(
          POWER(SIN(RADIANS(s.lat - $${latParam}) / 2), 2) +
          COS(RADIANS($${latParam})) * COS(RADIANS(s.lat)) *
          POWER(SIN(RADIANS(s.lng - $${lngParam}) / 2), 2)
        )))
      `;

      if (Number.isFinite(radiusKm)) {
        params.push(radiusKm);
        where += ` AND ${distanceExpr} <= $${params.length}`;
      }

      sql = `
        SELECT
          s.id, s.title, s.category, s.tags, s.description,
          s.country, s.region, s.city, s.area, s.lat, s.lng, s.created_at,
          u.id AS provider_id, u.email AS provider_email, u.phone AS provider_phone,
          u.display_name,
          ${distanceExpr} AS distance_km
        FROM skills s
        JOIN users u ON u.id = s.provider_id
        ${where}
        ORDER BY distance_km ASC, s.created_at DESC
        LIMIT 50
      `;
    } else {
      sql = `
        SELECT
          s.id, s.title, s.category, s.tags, s.description,
          s.country, s.region, s.city, s.area, s.lat, s.lng, s.created_at,
          u.id AS provider_id, u.email AS provider_email, u.phone AS provider_phone,
          u.display_name
        FROM skills s
        JOIN users u ON u.id = s.provider_id
        ${where}
        ORDER BY s.created_at DESC
        LIMIT 50
      `;
    }

    const userId = req.session?.user?.id || null;

    // Best-effort logging (never break search)
    try {
      await logEvent({
        req,
        eventType: "search",
        userId,
        meta: {
          country,
          region,
          city,
          area,
          category,
          q,
          lat,
          lng,
          radius_km: radiusKm,
        },
      });
    } catch (e) {
      console.error("SEARCH LOG EVENT ERROR:", e?.message || e);
    }

    const r = await query(sql, params);

    await attachIndexImages(r.rows);

    return res.json({ results: r.rows });
  } catch (e) {
    console.error("PUBLIC SEARCH ERROR:", e);
    return res.status(500).json({ error: "Search failed" });
  }
});

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
        s.country, s.region, s.city, s.area, s.lat, s.lng, s.created_at,
        u.id AS provider_id, u.email AS provider_email, u.phone AS provider_phone, u.display_name
       FROM skills s
       JOIN users u ON u.id = s.provider_id
       WHERE s.id=$1
         AND s.status='active'
         AND u.status='active'
         AND u.role='provider'`,
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
