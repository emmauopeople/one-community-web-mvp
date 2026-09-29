import express from "express";
import bcrypt from "bcrypt";
import requireAdminAuth from "../middleware/requireAdminAuth.js";
import pool from "../db/pool.js";
import { providerStatusChangesTotal } from "../metrics/metricsRegistry.js";

const router = express.Router();

router.get("/providers", requireAdminAuth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        u.id,
        u.display_name,
        u.email,
        u.phone,
        u.city,
        u.status,
        COUNT(s.id) AS skills_count
      FROM users u
      LEFT JOIN skills s
        ON s.provider_id = u.id
      WHERE u.role = 'provider'
      GROUP BY
        u.id,
        u.display_name,
        u.email,
        u.phone,
        u.city,
        u.status,
        u.created_at
      ORDER BY u.created_at DESC
    `);

    return res.status(200).json({
      message: "Providers fetched successfully",
      providers: result.rows,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch providers",
      error: error.message,
    });
  }
});

router.get("/providers/:id", requireAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
      SELECT
        u.id,
        u.display_name,
        u.email,
        u.phone,
        u.city,
        u.status,
        u.email_verified,
        u.created_at,
        u.updated_at,
        COUNT(s.id) AS skills_count
      FROM users u
      LEFT JOIN skills s
        ON s.provider_id = u.id
      WHERE u.id = $1 AND u.role = 'provider'
      GROUP BY
        u.id,
        u.display_name,
        u.email,
        u.phone,
        u.city,
        u.status,
        u.email_verified,
        u.created_at,
        u.updated_at
      `,
      [id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Provider not found",
      });
    }

    return res.status(200).json({
      message: "Provider fetched successfully",
      provider: result.rows[0],
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch provider",
      error: error.message,
    });
  }
});

router.patch("/providers/:id", requireAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { display_name, phone, city, status, changePassword, newPassword } =
      req.body;

    if (!["active", "inactive"].includes(status)) {
      return res.status(400).json({
        message: "Invalid status value",
      });
    }

    let passwordHashQuery = "";
    const values = [display_name, phone, city, status, id];

    if (changePassword) {
      if (!newPassword || newPassword.length < 8) {
        return res.status(400).json({
          message: "New password must be at least 8 characters",
        });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      passwordHashQuery = `, password_hash = $6`;
      values.push(hashedPassword);
    }

    const result = await pool.query(
      `
      UPDATE users
      SET
        display_name = $1,
        phone = $2,
        city = $3,
        status = $4,
        updated_at = NOW()
        ${passwordHashQuery}
      WHERE id = $5 AND role = 'provider'
      RETURNING id, display_name, email, phone, city, status, email_verified, updated_at
      `,
      values,
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Provider not found",
      });
    }

    return res.status(200).json({
      message: "Provider updated successfully",
      provider: result.rows[0],
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to update provider",
      error: error.message,
    });
  }
});

router.patch("/providers/:id/status", requireAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["active", "inactive"].includes(status)) {
      return res.status(400).json({
        message: "Invalid status value",
      });
    }

    const result = await pool.query(
      `
      UPDATE users
      SET status = $1, updated_at = NOW()
      WHERE id = $2 AND role = 'provider'
      RETURNING id, display_name, email, phone, city, status
      `,
      [status, id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Provider not found",
      });
    }
    providerStatusChangesTotal.inc();

    return res.status(200).json({
      message: "Provider status updated successfully",
      provider: result.rows[0],
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to update provider status",
      error: error.message,
    });
  }
});

export default router;
