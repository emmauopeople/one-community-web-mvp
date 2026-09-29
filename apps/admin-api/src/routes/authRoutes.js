import express from "express";
import bcrypt from "bcrypt";
import pool from "../db/pool.js";
import {
  adminLoginSuccessTotal,
  adminLoginFailureTotal,
} from "../metrics/metricsRegistry.js";

const router = express.Router();

router.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const ipAddress = req.ip;
    const userAgent = req.get("user-agent") || null;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    const result = await pool.query(
      `SELECT id, full_name, email, password_hash, role, is_active
       FROM admin_users
       WHERE email = $1`,
      [email],
    );

    if (result.rows.length === 0) {
      adminLoginFailureTotal.inc();

      await pool.query(
        `
        INSERT INTO admin_login_logs
          (admin_user_id, email_attempted, status, failure_reason, ip_address, user_agent)
        VALUES
          ($1, $2, $3, $4, $5, $6)
        `,
        [null, email, "failed", "email_not_found", ipAddress, userAgent],
      );

      return res.status(401).json({
        message: "Invalid credentials",
      });
    }

    const admin = result.rows[0];

    if (!admin.is_active) {
      adminLoginFailureTotal.inc();

      await pool.query(
        `
        INSERT INTO admin_login_logs
          (admin_user_id, email_attempted, status, failure_reason, ip_address, user_agent)
        VALUES
          ($1, $2, $3, $4, $5, $6)
        `,
        [admin.id, email, "failed", "inactive_account", ipAddress, userAgent],
      );

      return res.status(403).json({
        message: "Admin account is inactive",
      });
    }

    const isMatch = await bcrypt.compare(password, admin.password_hash);

    if (!isMatch) {
      adminLoginFailureTotal.inc();

      await pool.query(
        `
        INSERT INTO admin_login_logs
          (admin_user_id, email_attempted, status, failure_reason, ip_address, user_agent)
        VALUES
          ($1, $2, $3, $4, $5, $6)
        `,
        [admin.id, email, "failed", "invalid_password", ipAddress, userAgent],
      );

      return res.status(401).json({
        message: "Invalid credentials",
      });
    }

    req.session.admin = {
      id: admin.id,
      full_name: admin.full_name,
      email: admin.email,
      role: admin.role,
    };

    adminLoginSuccessTotal.inc();

    await pool.query(
      `
      INSERT INTO admin_login_logs
        (admin_user_id, email_attempted, status, failure_reason, ip_address, user_agent)
      VALUES
        ($1, $2, $3, $4, $5, $6)
      `,
      [admin.id, email, "success", null, ipAddress, userAgent],
    );

    return res.status(200).json({
      message: "Login successful",
      admin: req.session.admin,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
});

router.get("/auth/me", (req, res) => {
  if (!req.session.admin) {
    return res.status(401).json({
      message: "Not authenticated",
    });
  }

  return res.status(200).json({
    admin: req.session.admin,
  });
});

router.post("/auth/logout", (req, res) => {
  req.session.destroy((error) => {
    if (error) {
      return res.status(500).json({
        message: "Logout failed",
      });
    }

    res.clearCookie("connect.sid");

    return res.status(200).json({
      message: "Logout successful",
    });
  });
});

export default router;
