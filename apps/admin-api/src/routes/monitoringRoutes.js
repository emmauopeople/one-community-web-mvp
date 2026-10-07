import express from "express";
import requireAdminAuth from "../middleware/requireAdminAuth.js";
import pool from "../db/pool.js";

const router = express.Router();

router.get("/monitoring/admin-logins", requireAdminAuth, async (req, res) => {
  try {
    const minutes = Math.max(1, Number(req.query.minutes) || 15);

    const summaryResult = await pool.query(
      `
      SELECT
        COUNT(*) FILTER (WHERE status = 'success') AS success_count,
        COUNT(*) FILTER (WHERE status = 'failed') AS failed_count,
        COUNT(*) AS total_count
      FROM admin_login_logs
      WHERE created_at >= NOW() - ($1::text || ' minutes')::interval
      `,
      [minutes],
    );

    const recentLogsResult = await pool.query(
      `
      SELECT
        id,
        email_attempted,
        status,
        failure_reason,
        ip_address,
        created_at
      FROM admin_login_logs
      WHERE created_at >= NOW() - ($1::text || ' minutes')::interval
      ORDER BY created_at DESC
      LIMIT 20
      `,
      [minutes],
    );

    return res.status(200).json({
      message: "Admin login monitoring fetched successfully",
      minutes,
      summary: summaryResult.rows[0],
      recent_logs: recentLogsResult.rows,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch admin login monitoring",
      error: error.message,
    });
  }
});

router.get(
  "/monitoring/provider-logins",
  requireAdminAuth,
  async (req, res) => {
    try {
      const minutes = Math.max(1, Number(req.query.minutes) || 15);

      const summaryResult = await pool.query(
        `
      SELECT
        COUNT(*) FILTER (WHERE success = true) AS success_count,
        COUNT(*) FILTER (WHERE success = false) AS failed_count,
        COUNT(*) AS total_count
      FROM auth_logs
      WHERE created_at >= NOW() - ($1::text || ' minutes')::interval
        AND event_type = 'login'
      `,
        [minutes],
      );

      const recentLogsResult = await pool.query(
        `
      SELECT
        id,
        email,
        success,
        ip,
        created_at
      FROM auth_logs
      WHERE created_at >= NOW() - ($1::text || ' minutes')::interval
        AND event_type = 'login'
      ORDER BY created_at DESC
      LIMIT 20
      `,
        [minutes],
      );

      return res.status(200).json({
        message: "Provider login monitoring fetched successfully",
        minutes,
        summary: summaryResult.rows[0],
        recent_logs: recentLogsResult.rows,
      });
    } catch (error) {
      return res.status(500).json({
        message: "Failed to fetch provider login monitoring",
        error: error.message,
      });
    }
  },
);

export default router;
