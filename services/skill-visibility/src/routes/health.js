import express from "express";
import { query } from "../../db.js"; // db.js is at backend/db.js

const router = express.Router();

router.get("/healthz", (req, res) => res.status(200).json({ ok: true }));

router.get("/health/db", async (req, res) => {
  try {
    await query("SELECT 1");
    return res.status(200).json({ ok: true, db: "up" });
  } catch (err) {
    return res.status(503).json({
      ok: false,
      db: "down",
      error: err?.message || "DB check failed",
    });
  }
});

export default router;
