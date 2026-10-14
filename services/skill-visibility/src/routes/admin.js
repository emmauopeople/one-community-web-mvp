import express from "express";
import { query } from "../../db.js";
import { requireAuth, requireRole } from "../middleware/requireAuth.js";
import { logAuthEvent } from "../services/authLogService.js";

const router = express.Router();

// List providers
router.get(
  "/admin/providers",
  requireAuth,
  requireRole("admin"),
  async (req, res) => {
    const r = await query(
      `SELECT id, email, phone, role, status, display_name, city, created_at
     FROM users
     WHERE role = 'provider'
     ORDER BY created_at DESC`,
    );
    return res.json({ providers: r.rows });
  },
);

// Activate/deactivate provider
router.patch(
  "/admin/providers/:id/status",
  requireAuth,
  requireRole("admin"),
  async (req, res) => {
    const providerId = Number(req.params.id);
    const status = String(req.body.status || "").toLowerCase();

    if (!providerId || !["active", "inactive"].includes(status)) {
      return res.status(400).json({ error: "Invalid provider id or status" });
    }

    const updated = await query(
      `UPDATE users
     SET status = $2, updated_at = NOW()
     WHERE id = $1 AND role = 'provider'
     RETURNING id, email, status`,
      [providerId, status],
    );

    if (updated.rowCount === 0) {
      return res.status(404).json({ error: "Provider not found" });
    }

    await logAuthEvent({
      userId: req.session.user.id,
      email: req.session.user.email,
      eventType: "provider_status_change",
      success: true,
      req,
      details: { target_provider_id: providerId, new_status: status },
    });

    return res.json({ ok: true, provider: updated.rows[0] });
  },
);

export default router;
