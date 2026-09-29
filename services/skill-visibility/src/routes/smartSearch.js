import express from "express";
import { query } from "../../db.js";
import { logEvent } from "../services/eventService.js";
import { presignGet } from "../services/s3.js";

const router = express.Router();

const norm = (v) => String(v || "").trim();
const normLower = (v) => String(v || "").trim().toLowerCase();

const toNum = (v) => {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const aliasMap = {
  carpenter: ["carpenter", "carpentry", "wood", "furniture"],
  carpentry: ["carpenter", "carpentry", "wood", "furniture"],
  plumber: ["plumber", "plumbing"],
  plumbing: ["plumber", "plumbing"],
  electrician: ["electrician", "electrical", "electricity"],
  electrical: ["electrician", "electrical", "electricity"],
  tutor: ["tutor", "tutoring", "teacher", "lesson"],
  teacher: ["tutor", "tutoring", "teacher", "lesson"],
  mechanic: ["mechanic", "garage", "auto"],
  tailor: ["tailor", "tailoring", "sewing"],
  tailoring: ["tailor", "tailoring", "sewing"],
  cleaner: ["cleaner", "cleaning"],
  cleaning: ["cleaner", "cleaning"],
  driver: ["driver", "driving", "transport", "trucker"],
  transport: ["driver", "driving", "transport", "trucker"],
  trucker: ["driver", "driving", "transport", "trucker"],
};

const tokenizeSmartQuery = (q) =>
  normLower(q)
    .split(/[\s,;|/]+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2)
    .slice(0, 8);

const expandToken = (token) => aliasMap[token] || [token];

async function attachIndexImages(rows) {
  const bucket = process.env.S3_BUCKET;
  const expiresIn = Number(process.env.S3_PRESIGN_EXPIRES_SECONDS || 300);

  if (!bucket || !Array.isArray(rows) || rows.length === 0) return rows;

  const ids = rows.map((r) => Number(r.id)).filter(Boolean);
  if (ids.length === 0) return rows;

  const media = await query(
    `SELECT DISTINCT ON (skill_id) skill_id, s3_key
     FROM skill_media
     WHERE skill_id = ANY($1::bigint[])
     ORDER BY skill_id, sort_order ASC`,
    [ids],
  );

  const map = new Map(media.rows.map((item) => [Number(item.skill_id), item.s3_key]));

  for (const row of rows) {
    const key = map.get(Number(row.id));
    if (!key) {
      row.indexImageUrl = null;
      continue;
    }

    try {
      row.indexImageUrl = await presignGet({ bucket, key, expiresIn });
    } catch {
      row.indexImageUrl = null;
    }
  }

  return rows;
}

router.get("/skills/search", async (req, res) => {
  try {
    const country = normLower(req.query.country);
    const region = normLower(req.query.region);
    const city = normLower(req.query.city);
    const area = normLower(req.query.area);
    const category = normLower(req.query.category);
    const q = norm(req.query.q);
    const tokens = tokenizeSmartQuery(q);

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

    for (const token of tokens) {
      const patterns = expandToken(token);
      const tokenClauses = [];

      for (const pattern of patterns) {
        params.push(`%${pattern}%`);
        const p = `$${params.length}`;
        tokenClauses.push(`(
          s.title ILIKE ${p}
          OR s.description ILIKE ${p}
          OR s.tags ILIKE ${p}
          OR s.category ILIKE ${p}
          OR s.area ILIKE ${p}
          OR s.city ILIKE ${p}
          OR s.region ILIKE ${p}
          OR s.country ILIKE ${p}
          OR u.display_name ILIKE ${p}
        )`);
      }

      where += ` AND (${tokenClauses.join(" OR ")})`;
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

    try {
      await logEvent({
        req,
        eventType: "search",
        userId: req.session?.user?.id || null,
        meta: {
          country,
          region,
          city,
          area,
          category,
          q,
          tokens,
          lat,
          lng,
          radius_km: radiusKm,
        },
      });
    } catch (e) {
      console.error("SMART SEARCH LOG EVENT ERROR:", e?.message || e);
    }

    const result = await query(sql, params);
    await attachIndexImages(result.rows);

    return res.json({ results: result.rows, searchMode: "smart", tokens });
  } catch (e) {
    console.error("SMART PUBLIC SEARCH ERROR:", e);
    return res.status(500).json({ error: "Search failed" });
  }
});

export default router;
