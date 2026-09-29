import express from "express";
import { query } from "../../db.js";
import nodemailer from "nodemailer";

const router = express.Router();

function isEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
}

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: false,
  ...(process.env.SMTP_USER
    ? { auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } }
    : {}),
});

router.post("/contact/email", async (req, res) => {
  try {
    const skillId = Number(req.body.skillId);
    const fromEmail = String(req.body.fromEmail || "").trim();
    const message = String(req.body.message || "").trim();

    if (
      !skillId ||
      !isEmail(fromEmail) ||
      message.length < 10 ||
      message.length > 2000
    ) {
      return res.status(400).json({ error: "Invalid input" });
    }

    // only allow active skill + active provider
    const r = await query(
      `SELECT s.id, s.title, s.city, u.email AS provider_email
       FROM skills s
       JOIN users u ON u.id = s.provider_id
       WHERE s.id=$1 AND s.status='active' AND u.status='active' AND u.role='provider' AND u.gps_consent_at IS NOT NULL AND u.gps_consent_version='provider-gps-v1.2' AND u.gps_consent_withdrawn_at IS NULL`,
      [skillId],
    );

    if (r.rowCount === 0)
      return res.status(404).json({ error: "Skill not found" });

    const { title, city, provider_email } = r.rows[0];

    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: provider_email,
      replyTo: fromEmail,
      subject: `One Community inquiry: ${title || "Service"}`,
      text:
        `You received an inquiry from One Community.\n\n` +
        `Service: ${title || ""}\n` +
        `City: ${city || ""}\n` +
        `From: ${fromEmail}\n\n` +
        `Message:\n${message}\n`,
    });

    return res.json({ ok: true });
  } catch (e) {
    console.error("CONTACT EMAIL ERROR:", e);
    return res.status(500).json({ error: "Failed to send inquiry" });
  }
});

export default router;
