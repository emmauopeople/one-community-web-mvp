import express from "express";
import bcrypt from "bcrypt";
import requireRootAdmin from "../middleware/requireRootAdmin.js";
import pool from "../db/pool.js";

const router = express.Router();

router.get("/admins", requireRootAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        id,
        full_name,
        email,
        role,
        is_active,
        created_at,
        updated_at
      FROM admin_users
      ORDER BY created_at DESC
    `);

    return res.status(200).json({
      message: "Admins fetched successfully",
      admins: result.rows,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch admins",
      error: error.message,
    });
  }
});

router.get("/admins/:id", requireRootAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
      SELECT
        id,
        full_name,
        email,
        role,
        is_active,
        created_at,
        updated_at
      FROM admin_users
      WHERE id = $1
      `,
      [id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Admin not found",
      });
    }

    return res.status(200).json({
      message: "Admin fetched successfully",
      admin: result.rows[0],
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch admin",
      error: error.message,
    });
  }
});

router.post("/admins", requireRootAdmin, async (req, res) => {
  try {
    const { full_name, email, password } = req.body;

    if (!full_name || !email || !password) {
      return res.status(400).json({
        message: "Full name, email, and password are required",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        message: "Password must be at least 8 characters",
      });
    }

    const existingAdmin = await pool.query(
      `SELECT id FROM admin_users WHERE email = $1`,
      [email],
    );

    if (existingAdmin.rows.length > 0) {
      return res.status(409).json({
        message: "An admin with this email already exists",
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `
      INSERT INTO admin_users (
        full_name,
        email,
        password_hash,
        role,
        is_active
      )
      VALUES ($1, $2, $3, 'admin', true)
      RETURNING id, full_name, email, role, is_active, created_at, updated_at
      `,
      [full_name, email, passwordHash],
    );

    const createdAdmin = result.rows[0];

    await pool.query(
      `
      INSERT INTO audit_logs (
        actor_admin_id,
        action_type,
        target_type,
        target_id,
        details
      )
      VALUES ($1, $2, $3, $4, $5::jsonb)
      `,
      [
        req.session.admin.id,
        "admin_created",
        "admin",
        String(createdAdmin.id),
        JSON.stringify({
          full_name: createdAdmin.full_name,
          email: createdAdmin.email,
          role: createdAdmin.role,
          is_active: createdAdmin.is_active,
        }),
      ],
    );

    return res.status(201).json({
      message: "Admin created successfully",
      admin: createdAdmin,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to create admin",
      error: error.message,
    });
  }
});

router.patch("/admins/:id", requireRootAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { full_name, email, role, is_active, changePassword, newPassword } =
      req.body;

    if (!full_name || !email || !role) {
      return res.status(400).json({
        message: "Full name, email, and role are required",
      });
    }

    if (!["root_admin", "admin"].includes(role)) {
      return res.status(400).json({
        message: "Invalid role",
      });
    }

    const existingAdmin = await pool.query(
      `SELECT id FROM admin_users WHERE email = $1 AND id <> $2`,
      [email, id],
    );

    if (existingAdmin.rows.length > 0) {
      return res.status(409).json({
        message: "Another admin with this email already exists",
      });
    }

    if (changePassword && (!newPassword || newPassword.length < 8)) {
      return res.status(400).json({
        message: "New password must be at least 8 characters",
      });
    }

    const currentAdminResult = await pool.query(
      `SELECT id, role, is_active FROM admin_users WHERE id = $1`,
      [id],
    );

    if (currentAdminResult.rows.length === 0) {
      return res.status(404).json({
        message: "Admin not found",
      });
    }

    const currentAdmin = currentAdminResult.rows[0];

    if (req.session.admin.id === id && is_active === false) {
      return res.status(400).json({
        message: "You cannot deactivate your own account",
      });
    }

    if (currentAdmin.role === "root_admin" && role !== "root_admin") {
      const rootCountResult = await pool.query(
        `SELECT COUNT(*)::int AS count FROM admin_users WHERE role = 'root_admin' AND is_active = true`,
      );

      if (rootCountResult.rows[0].count <= 1) {
        return res.status(400).json({
          message: "At least one active root admin must remain",
        });
      }
    }

    if (currentAdmin.role === "root_admin" && is_active === false) {
      const rootCountResult = await pool.query(
        `SELECT COUNT(*)::int AS count FROM admin_users WHERE role = 'root_admin' AND is_active = true`,
      );

      if (rootCountResult.rows[0].count <= 1) {
        return res.status(400).json({
          message: "At least one active root admin must remain",
        });
      }
    }

    let passwordQuery = "";
    const values = [full_name, email, role, is_active, id];

    if (changePassword) {
      const passwordHash = await bcrypt.hash(newPassword, 10);
      passwordQuery = `, password_hash = $6`;
      values.push(passwordHash);
    }

    const result = await pool.query(
      `
      UPDATE admin_users
      SET
        full_name = $1,
        email = $2,
        role = $3,
        is_active = $4,
        updated_at = NOW()
        ${passwordQuery}
      WHERE id = $5
      RETURNING id, full_name, email, role, is_active, created_at, updated_at
      `,
      values,
    );

    const updatedAdmin = result.rows[0];

    await pool.query(
      `
      INSERT INTO audit_logs (
        actor_admin_id,
        action_type,
        target_type,
        target_id,
        details
      )
      VALUES ($1, $2, $3, $4, $5::jsonb)
      `,
      [
        req.session.admin.id,
        "admin_updated",
        "admin",
        String(updatedAdmin.id),
        JSON.stringify({
          full_name: updatedAdmin.full_name,
          email: updatedAdmin.email,
          role: updatedAdmin.role,
          is_active: updatedAdmin.is_active,
          password_changed: Boolean(changePassword),
        }),
      ],
    );

    return res.status(200).json({
      message: "Admin updated successfully",
      admin: updatedAdmin,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to update admin",
      error: error.message,
    });
  }
});

export default router;
