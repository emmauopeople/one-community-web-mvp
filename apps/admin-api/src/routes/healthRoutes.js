import express from "express";
import pool from "../db/pool.js";

const router = express.Router();

router.get("/health", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.status(200).json({
      message: "Admin backend is running",
      db: "connected",
      time: result.rows[0].now,
    });
  } catch (error) {
    res.status(500).json({
      message: "Admin backend is running",
      db: "not connected",
      error: error.message,
    });
  }
});

export default router;
