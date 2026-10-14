import express from "express";
import requireAdminAuth from "../middleware/requireAdminAuth.js";
import pool from "../db/pool.js";
import { skillUpdatesTotal } from "../metrics/metricsRegistry.js";

const router = express.Router();

router.get("/skills", requireAdminAuth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        s.id,
        s.provider_id,
        s.title,
        s.category,
        s.tags,
        s.description,
        s.country,
        s.region,
        s.city,
        s.area,
        s.lat,
        s.lng,
        s.status,
        s.created_at,
        u.display_name AS provider_name,
        u.email AS provider_email
      FROM skills s
      JOIN users u
        ON u.id = s.provider_id
      ORDER BY s.created_at DESC
    `);

    return res.status(200).json({
      message: "Skills fetched successfully",
      skills: result.rows,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch skills",
      error: error.message,
    });
  }
});

router.get("/skills/:id", requireAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
      SELECT
        s.id,
        s.provider_id,
        s.title,
        s.category,
        s.tags,
        s.description,
        s.country,
        s.region,
        s.city,
        s.area,
        s.lat,
        s.lng,
        s.status,
        s.created_at,
        s.updated_at,
        u.display_name AS provider_name,
        u.email AS provider_email
      FROM skills s
      JOIN users u
        ON u.id = s.provider_id
      WHERE s.id = $1
      `,
      [id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Skill not found",
      });
    }

    return res.status(200).json({
      message: "Skill fetched successfully",
      skill: result.rows[0],
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch skill",
      error: error.message,
    });
  }
});

router.patch("/skills/:id", requireAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, category, tags, description, city, status } = req.body;

    if (!["active", "inactive"].includes(status)) {
      return res.status(400).json({
        message: "Invalid status value",
      });
    }

    const result = await pool.query(
      `
      UPDATE skills
      SET
        title = $1,
        category = $2,
        tags = $3,
        description = $4,
        city = $5,
        status = $6,
        updated_at = NOW()
      WHERE id = $7
      RETURNING *
      `,
      [title, category, tags, description, city, status, id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Skill not found",
      });
    }
    skillUpdatesTotal.inc();

    return res.status(200).json({
      message: "Skill updated successfully",
      skill: result.rows[0],
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to update skill",
      error: error.message,
    });
  }
});

export default router;
