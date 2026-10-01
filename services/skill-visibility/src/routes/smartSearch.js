import express from "express";
import { query } from "../../db.js";
import { logEvent } from "../services/eventService.js";
import { presignGet } from "../services/s3.js";
import { discoveryQuery } from "../services/discoveryQuery.js";
const router = express.Router();
async function attachIndexImages(rows) {
  const bucket = process.env.S3_BUCKET;
  const expiresIn = Number(process.env.S3_PRESIGN_EXPIRES_SECONDS || 300);

  if (!bucket || !Array.isArray(rows) || rows.length === 0) return rows;

  const ids = rows.map((r) => Number(r.id)).filter(Boolean);
  if (ids.length === 0) return rows;

  const media = await query(
    `SELECT DISTINCT ON (skill_id) skill_id, COALESCE(thumbnail_s3_key,s3_key) AS s3_key
     FROM skill_media
     WHERE skill_id = ANY($1::bigint[])
     ORDER BY skill_id, sort_order ASC`,
    [ids],
  );

  const map = new Map(
    media.rows.map((item) => [Number(item.skill_id), item.s3_key]),
  );

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
  let search;
  try {
    search = discoveryQuery(req.query);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
  try {
    const result = await query(search.sql, search.params);
    const hasMore = result.rows.length > 12;
    const rows = result.rows
      .slice(0, 12)
      .map(({ lat, lng, ...row }) => ({
        ...row,
        distance_km:
          row.distance_km == null
            ? null
            : Math.round(Number(row.distance_km) * 10) / 10,
      }));
    await attachIndexImages(rows);
    try {
      await logEvent({
        req,
        eventType: "search",
        userId: req.session?.user?.id || null,
        meta: {
          q: typeof req.query.q === "string" ? req.query.q.slice(0, 200) : null,
          city: req.query.city || null,
          area: req.query.area || null,
          category: req.query.category || null,
          result_count: rows.length,
          search_mode: search.hasGeo ? "nearby" : "general",
          radius_km: search.hasGeo ? search.radius : null,
        },
      });
    } catch {
      console.error("Search analytics write failed");
    }
    res.set("Cache-Control", "no-store");
    res.json({
      results: rows,
      page: search.page,
      hasMore,
      searchMode: search.hasGeo ? "nearby" : "general",
      radiusKm: search.hasGeo ? search.radius : null,
    });
  } catch {
    res.status(500).json({ error: "Search failed. Please retry." });
  }
});
export default router;
