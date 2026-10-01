import express from "express";
import requireAdminAuth from "../middleware/requireAdminAuth.js";
import pool from "../db/pool.js";
const router = express.Router();
const states = ["pending", "approved", "rejected"];
router.use("/reviews", requireAdminAuth, async (req, res, next) => {
  try {
    const result = await pool.query(
      "SELECT id FROM admin_users WHERE id=$1 AND is_active=true AND role IN ('admin','root_admin')",
      [req.session.admin.id],
    );
    if (!result.rowCount)
      return res.status(403).json({ message: "Active admin access required." });
    next();
  } catch {
    res.status(500).json({ message: "Unable to verify admin access." });
  }
});
router.get("/reviews", async (req, res) => {
  const status = req.query.status || "pending",
    page = Number(req.query.page || 1);
  if (
    !states.includes(status) ||
    !Number.isInteger(page) ||
    page < 1 ||
    page > 1000
  )
    return res.status(400).json({ message: "Invalid status or page." });
  try {
    const data = await pool.query(
      `SELECT r.*,u.display_name AS provider_name,s.title AS skill_title FROM provider_reviews r JOIN users u ON u.id=r.provider_id LEFT JOIN skills s ON s.id=r.skill_id WHERE r.status=$1 ORDER BY r.created_at,r.id LIMIT 21 OFFSET $2`,
      [status, (page - 1) * 20],
    );
    const counts = await pool.query(
      "SELECT status,count(*)::int AS count FROM provider_reviews GROUP BY status",
    );
    res
      .set("Cache-Control", "no-store")
      .json({
        reviews: data.rows.slice(0, 20),
        hasMore: data.rows.length > 20,
        page,
        counts: Object.fromEntries(counts.rows.map((r) => [r.status, r.count])),
      });
  } catch {
    res.status(500).json({ message: "Unable to load review queue." });
  }
});
router.patch("/reviews/:id", async (req, res) => {
  const { status, version, verified } = req.body,
    notes = typeof req.body.notes === "string" ? req.body.notes.trim() : "";
  if (
    !/^\d+$/.test(req.params.id) ||
    !states.includes(status) ||
    !Number.isInteger(version) ||
    version < 1 ||
    notes.length < 5 ||
    notes.length > 1000 ||
    (status === "approved" && verified !== true)
  )
    return res
      .status(400)
      .json({
        message:
          "Choose a decision, add notes (5–1,000 characters), and confirm verification before approval.",
      });
  try {
    // Version-guarded update and audit insertion are one PostgreSQL statement/transaction.
    const result = await pool.query(
      `WITH changed AS (
 UPDATE provider_reviews SET status=$2,verification_notes=$3,reviewed_by=$4,reviewed_at=now(),updated_at=now(),approved_at=CASE WHEN $2='approved' THEN now() ELSE NULL END,version=version+1
 WHERE id=$1 AND version=$5 AND status<>$2 AND EXISTS(SELECT 1 FROM admin_users WHERE id=$4 AND is_active=true AND role IN ('admin','root_admin')) RETURNING id,status,version
 ), logged AS (INSERT INTO audit_logs(actor_admin_id,action_type,target_type,target_id,details) SELECT $4,'review_moderation','provider_review',id::text,jsonb_build_object('status',status,'version',version,'notes',$3::text,'verification_confirmed',$6::boolean) FROM changed)
 SELECT * FROM changed`,
      [
        req.params.id,
        status,
        notes,
        req.session.admin.id,
        version,
        verified === true,
      ],
    );
    if (!result.rowCount)
      return res
        .status(409)
        .json({
          message:
            "Review changed or is unavailable. Refresh the queue before deciding.",
        });
    res.json({ review: result.rows[0] });
  } catch {
    res.status(500).json({ message: "Unable to save review decision." });
  }
});
export default router;
