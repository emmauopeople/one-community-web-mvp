import express from "express";
import { logEvent } from "../services/eventService.js";

const router = express.Router();

const ALLOWED = new Set([
  "search",
  "skill_view",
  "contact_click_whatsapp",
  "contact_click_email",
  "media_presign",
  "media_confirm",
  "profile_update",
]);

router.post("/", async (req, res) => {
  const eventType = String(req.body?.eventType || "").trim();
  const meta =
    req.body?.meta && typeof req.body.meta === "object" ? req.body.meta : {};

  if (!ALLOWED.has(eventType)) {
    return res.status(400).json({ error: "Invalid eventType" });
  }

  const userId = req.session?.user?.id || null;

  try {
    await logEvent({ req, eventType, userId, meta });
  } catch (e) {
    console.error("EVENT LOG ERROR:", e?.message || e);
  }

  return res.json({ ok: true });
});

export default router;
