import express from "express";
import rateLimit from "express-rate-limit";
import { query } from "../../db.js";
const router = express.Router();
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function validateFeedback(b) {
  const text = (v) => (typeof v === "string" ? v.trim() : "");
  const kind = b.kind,
    category = b.category,
    subject = text(b.subject),
    description = text(b.description),
    email = text(b.email).toLowerCase();
  if (
    !uuid.test(b.submissionId || "") ||
    !["report", "survey"].includes(kind) ||
    !["web", "mobile"].includes(b.channel) ||
    !["en", "fr"].includes(b.language)
  )
    return null;
  if (subject.length > 180 || description.length > 3000) return null;
  if (
    kind === "report" &&
    (![
      "app_problem",
      "suggestion",
      "application_comment",
      "provider_problem",
    ].includes(category) ||
      subject.length < 3 ||
      description.length < 10)
  )
    return null;
  if (kind === "survey" && typeof b.useful !== "boolean") return null;
  if (b.useful != null && typeof b.useful !== "boolean") return null;
  if (
    typeof b.contactConsent !== "boolean" ||
    (b.contactConsent &&
      (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254))
  )
    return null;
  const status = b.locationStatus;
  if (!["captured", "denied", "unavailable", "not_requested"].includes(status))
    return null;
  let lat = null,
    lng = null;
  if (status === "captured") {
    if (
      typeof b.latitude !== "number" ||
      typeof b.longitude !== "number" ||
      !Number.isFinite(b.latitude) ||
      !Number.isFinite(b.longitude) ||
      Math.abs(b.latitude) > 90 ||
      Math.abs(b.longitude) > 180
    )
      return null;
    lat = Number(b.latitude.toFixed(3));
    lng = Number(b.longitude.toFixed(3));
  }
  return [
    b.submissionId,
    kind,
    kind === "report" ? category : null,
    subject,
    description,
    b.contactConsent ? email : null,
    b.contactConsent,
    b.useful ?? null,
    b.channel,
    b.language,
    lat,
    lng,
    status,
  ];
}
router.post(
  "/feedback",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 15,
    standardHeaders: true,
    legacyHeaders: false,
  }),
  async (req, res) => {
    const values = validateFeedback(req.body || {});
    if (!values)
      return res.status(400).json({ error: "Check the feedback fields." });
    try {
      await query(
        `INSERT INTO public_feedback(submission_id,kind,category,subject,description,email,contact_consent,useful,channel,language,latitude,longitude,location_status) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) ON CONFLICT(submission_id) DO NOTHING`,
        values,
      );
      // Never return private fields or allow a public lookup by submission ID.
      res.status(201).set("Cache-Control", "no-store").json({ ok: true });
    } catch {
      res
        .status(500)
        .json({ error: "Unable to save feedback. Please try again." });
    }
  },
);
export default router;
