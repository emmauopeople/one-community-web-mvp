import express from "express";
import nodemailer from "nodemailer";
import requireAdminAuth from "../middleware/requireAdminAuth.js";
import pool from "../db/pool.js";
const router = express.Router();
router.use("/feedback", requireAdminAuth, async (req, res, next) => {
  try {
    const r = await pool.query(
      "SELECT id FROM admin_users WHERE id=$1 AND is_active=true AND role IN ('admin','root_admin')",
      [req.session.admin.id],
    );
    if (!r.rowCount) return res.sendStatus(403);
    res.set("Cache-Control", "no-store");
    next();
  } catch {
    res.sendStatus(500);
  }
});
router.get("/feedback", async (req, res) => {
  const kind = req.query.kind || "all",
    page = Number(req.query.page || 1);
  if (
    !["all", "report", "survey"].includes(kind) ||
    !Number.isInteger(page) ||
    page < 1 ||
    page > 10000
  )
    return res.sendStatus(400);
  try {
    const rows = await pool.query(
      "SELECT * FROM public_feedback WHERE ($1='all' OR kind=$1) ORDER BY created_at DESC,id DESC LIMIT 21 OFFSET $2",
      [kind, (page - 1) * 20],
    );
    const summary = await pool.query(
      "SELECT kind,useful,count(*)::int AS count FROM public_feedback GROUP BY kind,useful",
    );
    res.json({
      items: rows.rows.slice(0, 20),
      hasMore: rows.rows.length > 20,
      summary: summary.rows,
    });
  } catch {
    res.sendStatus(500);
  }
});
router.get("/feedback/:id/replies", async (req, res) => {
  if (!/^[1-9][0-9]*$/.test(req.params.id)) return res.sendStatus(400);
  try {
    const r = await pool.query(
      "SELECT id,body,delivery_status,created_at,sent_at FROM feedback_replies WHERE feedback_id=$1 ORDER BY created_at,id",
      [req.params.id],
    );
    res.json({ replies: r.rows });
  } catch {
    res.sendStatus(500);
  }
});
router.patch("/feedback/:id", async (req, res) => {
  if (
    !/^[1-9][0-9]*$/.test(req.params.id) ||
    !["new", "in_progress", "resolved"].includes(req.body.status)
  )
    return res.sendStatus(400);
  try {
    const r = await pool.query(
      `WITH changed AS (UPDATE public_feedback SET status=$2 WHERE id=$1 RETURNING id), audit AS (INSERT INTO audit_logs(actor_admin_id,action_type,target_type,target_id,details) SELECT $3,'feedback_status','feedback',id::text,jsonb_build_object('status',$2::text) FROM changed) SELECT * FROM changed`,
      [req.params.id, req.body.status, req.session.admin.id],
    );
    res.sendStatus(r.rowCount ? 200 : 404);
  } catch {
    res.sendStatus(500);
  }
});
router.post("/feedback/:id/replies", async (req, res) => {
  const body = typeof req.body.body === "string" ? req.body.body.trim() : "",
    key = req.body.requestId;
  if (
    !/^[1-9][0-9]*$/.test(req.params.id) ||
    !body ||
    body.length > 3000 ||
    !/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(key || "")
  )
    return res.sendStatus(400);
  let reply;
  try {
    const f = (
      await pool.query(
        "SELECT email,contact_consent,subject,language FROM public_feedback WHERE id=$1",
        [req.params.id],
      )
    ).rows[0];
    if (!f) return res.sendStatus(404);
    if (!f.contact_consent || !f.email)
      return res.status(409).json({ message: "Contact consent is required." });
    if (!process.env.SMTP_HOST)
      return res.status(503).json({ message: "Email is not configured." });
    const inserted = await pool.query(
      `WITH reply AS (INSERT INTO feedback_replies(feedback_id,admin_id,request_id,body) VALUES($1,$2,$3,$4) ON CONFLICT(request_id) DO NOTHING RETURNING *), audit AS (INSERT INTO audit_logs(actor_admin_id,action_type,target_type,target_id) SELECT $2,'feedback_reply','feedback',feedback_id::text FROM reply) SELECT * FROM reply`,
      [req.params.id, req.session.admin.id, key, body],
    );
    reply = inserted.rows[0];
    if (!reply)
      return res
        .status(409)
        .json({
          message:
            "This reply was already submitted. Check its delivery status.",
        });
    const transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: Number(process.env.SMTP_PORT || 587) === 465,
      ...(process.env.SMTP_USER
        ? { auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } }
        : {}),
      connectionTimeout: 10000,
      socketTimeout: 15000,
    });
    await transport.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: f.email,
      subject:
        (f.language === "fr"
          ? "Réponse One Community : "
          : "One Community reply: ") + (f.subject || "Feedback"),
      text: body,
    });
    await pool.query(
      "UPDATE feedback_replies SET delivery_status='sent',sent_at=now() WHERE id=$1",
      [reply.id],
    );
    res.json({
      ok: true,
      deliveryStatus: "sent",
      localOnly: process.env.SMTP_HOST === "mailpit",
    });
  } catch {
    // SMTP failures can be ambiguous. Keep history; never automatically retry.
    if (reply)
      try {
        await pool.query(
          "UPDATE feedback_replies SET delivery_status='failed' WHERE id=$1",
          [reply.id],
        );
      } catch {}
    res
      .status(502)
      .json({
        message:
          "Reply delivery could not be confirmed. Check delivery history before retrying.",
      });
  }
});
export default router;
