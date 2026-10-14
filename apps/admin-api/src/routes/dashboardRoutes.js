import express from "express";
import requireAdminAuth from "../middleware/requireAdminAuth.js";
import pool from "../db/pool.js";

const router = express.Router();

router.get("/dashboard/summary", requireAdminAuth, async (req, res) => {
  try {
    const providersResult = await pool.query(
      `
      SELECT
        COUNT(*) FILTER (WHERE role = 'provider')::int AS total_providers,
        COUNT(*) FILTER (
          WHERE role = 'provider' AND status = 'active'
        )::int AS active_providers
      FROM users
      `,
    );

    const skillsResult = await pool.query(
      `
      SELECT
        COUNT(*)::int AS total_skills
      FROM skills
      `,
    );

    const requestsResult = await pool.query(
      `
      SELECT
        COUNT(*)::int AS open_requests
      FROM support_requests
      WHERE status IN ('incomplete', 'in_progress')
      `,
    );

    const providerStats = providersResult.rows[0] || {};
    const skillStats = skillsResult.rows[0] || {};
    const requestStats = requestsResult.rows[0] || {};

    return res.status(200).json({
      message: "Dashboard summary fetched successfully",
      stats: {
        totalProviders: Number(providerStats.total_providers || 0),
        activeProviders: Number(providerStats.active_providers || 0),
        totalSkills: Number(skillStats.total_skills || 0),
        openRequests: Number(requestStats.open_requests || 0),
      },
      admin: req.session.admin,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch dashboard summary",
      error: error.message,
    });
  }
});

export default router;
