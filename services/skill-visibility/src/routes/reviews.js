import express from "express";
import rateLimit from "express-rate-limit";
import { query } from "../../db.js";
const router = express.Router();
const visible =
  "u.role='provider' AND u.status='active' AND u.gps_consent_at IS NOT NULL AND u.gps_consent_version='provider-gps-v1.2' AND u.gps_consent_withdrawn_at IS NULL";
const positive = (v) =>
  /^\d+$/.test(String(v)) && Number.isSafeInteger(Number(v)) && Number(v) > 0;
const clean = (v) => (typeof v === "string" ? v.trim() : "");
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: "draft-7",
  legacyHeaders: false,
});
router.get("/providers/:id/reviews", async (req, res) => {
  res.set("Cache-Control", "no-store");
  const page = req.query.page === undefined ? 1 : Number(req.query.page);
  if (
    !positive(req.params.id) ||
    !Number.isInteger(page) ||
    page < 1 ||
    page > 1000
  )
    return res.status(400).json({ error: "Invalid provider or page." });
  try {
    const provider = await query(
      `SELECT u.id FROM users u WHERE u.id=$1 AND ${visible}`,
      [req.params.id],
    );
    if (!provider.rowCount)
      return res.status(404).json({ error: "Provider not found." });
    // Both the list and aggregate join visibility, so a concurrent withdrawal cannot expose reviews.
    const rows = await query(
      `SELECT r.id,r.reviewer_name,r.rating,r.body,r.approved_at,r.skill_id FROM provider_reviews r JOIN users u ON u.id=r.provider_id WHERE r.provider_id=$1 AND r.status='approved' AND ${visible} ORDER BY r.approved_at DESC,r.id DESC LIMIT 11 OFFSET $2`,
      [req.params.id, (page - 1) * 10],
    );
    const summary = await query(
      `SELECT count(*)::int AS count,round(avg(r.rating),1)::float AS average FROM provider_reviews r JOIN users u ON u.id=r.provider_id WHERE r.provider_id=$1 AND r.status='approved' AND ${visible}`,
      [req.params.id],
    );
    return res.json({
      reviews: rows.rows.slice(0, 10),
      hasMore: rows.rows.length > 10,
      page,
      summary: summary.rows[0],
    });
  } catch {
    res.status(500).json({ error: "Unable to load reviews." });
  }
});
router.post("/providers/:id/reviews", limiter, async (req, res) => {
  const name = clean(req.body.name),
    email = clean(req.body.email).toLowerCase(),
    body = clean(req.body.body),
    rating = req.body.rating;
  if (
    !positive(req.params.id) ||
    name.length < 2 ||
    name.length > 60 ||
    email.length > 254 ||
    !/^\S+@[^\s@]+\.[^\s@]+$/.test(email) ||
    !Number.isInteger(rating) ||
    rating < 1 ||
    rating > 5 ||
    body.length < 20 ||
    body.length > 2000 ||
    req.body.publicationConsent !== true ||
    (req.body.skillId != null && !positive(req.body.skillId))
  )
    return res
      .status(400)
      .json({
        error:
          "Enter a name, valid email, rating (1–5), review (20–2,000 characters), and publication consent.",
      });
  try {
    const result = await query(
      `INSERT INTO provider_reviews(provider_id,skill_id,reviewer_name,reviewer_email,rating,body)
 SELECT u.id,$2,$3,$4,$5,$6 FROM users u WHERE u.id=$1 AND ${visible}
 AND ($2::bigint IS NULL OR EXISTS(SELECT 1 FROM skills s WHERE s.id=$2 AND s.provider_id=u.id AND s.status='active')) RETURNING id`,
      [req.params.id, req.body.skillId ?? null, name, email, rating, body],
    );
    if (!result.rowCount)
      return res
        .status(404)
        .json({ error: "Provider or service not available." });
    res
      .status(202)
      .json({
        status: "pending",
        message:
          "Review submitted for admin verification. It will appear only after approval.",
      });
  } catch (e) {
    if (e.code === "23505")
      return res
        .status(409)
        .json({
          error:
            "A review has already been submitted for this provider with this email.",
        });
    res.status(500).json({ error: "Unable to submit review. Please retry." });
  }
});
export default router;
