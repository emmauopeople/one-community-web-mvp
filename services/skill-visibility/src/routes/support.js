import express from "express";
import rateLimit from "express-rate-limit";
import { query } from "../../db.js";
import { requireAuth, requireRole } from "../middleware/requireAuth.js";

const router = express.Router();

const allowedCategories = new Set([
  "general_question",
  "technical_issue",
  "provider_complaint",
  "service_request",
  "account_issue",
  "report_problem",
  "other",
]);

const activeStatuses = new Set(["incomplete", "in_progress"]);

const supportLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

function clean(value) {
  return String(value || "").trim();
}

function normalizeEmail(email) {
  return clean(email).toLowerCase();
}

function isEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isAllowedCategory(category) {
  return allowedCategories.has(category);
}

function validateBaseRequest({ name, email, category, subject, description }) {
  if (!name || name.length < 2 || name.length > 120) {
    return "Name must be 2-120 characters.";
  }

  if (!email || !isEmail(email) || email.length > 255) {
    return "A valid email address is required.";
  }

  if (!category || !isAllowedCategory(category)) {
    return "Invalid message category.";
  }

  if (!subject || subject.length < 3 || subject.length > 180) {
    return "Subject must be 3-180 characters.";
  }

  if (!description || description.length < 10 || description.length > 3000) {
    return "Message must be 10-3000 characters.";
  }

  return null;
}

function serializeRequest(row) {
  return {
    id: row.id,
    requesterType: row.requester_type,
    requesterUserId: row.requester_user_id,
    requesterName: row.requester_name,
    requesterEmail: row.requester_email,
    category: row.category,
    subject: row.subject,
    description: row.description,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastMessageAt: row.last_message_at,
    closedAt: row.closed_at,
    messageCount: row.message_count ? Number(row.message_count) : undefined,
  };
}

function serializeMessage(row) {
  return {
    id: row.id,
    requestId: row.request_id,
    senderType: row.sender_type,
    senderUserId: row.sender_user_id,
    senderName: row.sender_name,
    senderEmail: row.sender_email,
    message: row.message,
    isInternal: row.is_internal,
    createdAt: row.created_at,
  };
}

// Public Contact Us form.
// This is separate from contact.js, which is for public users contacting providers.
router.post("/support/public-requests", supportLimiter, async (req, res) => {
  try {
    const name = clean(req.body.name);
    const email = normalizeEmail(req.body.email);
    const category = clean(req.body.category);
    const subject = clean(req.body.subject);
    const description = clean(req.body.description);

    const validationError = validateBaseRequest({
      name,
      email,
      category,
      subject,
      description,
    });

    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const result = await query(
      `WITH created_request AS (
        INSERT INTO support_requests
          (requester_type, requester_user_id, requester_name, requester_email, category, subject, description)
        VALUES
          ('public', NULL, $1, $2, $3, $4, $5)
        RETURNING *
      ), created_message AS (
        INSERT INTO support_request_messages
          (request_id, sender_type, sender_user_id, sender_name, sender_email, message, is_internal)
        SELECT
          id, 'public', NULL, requester_name, requester_email, description, FALSE
        FROM created_request
        RETURNING id
      )
      SELECT * FROM created_request`,
      [name, email, category, subject, description],
    );

    return res.status(201).json({
      ok: true,
      request: serializeRequest(result.rows[0]),
    });
  } catch (error) {
    console.error("PUBLIC SUPPORT REQUEST ERROR:", error);
    return res.status(500).json({ error: "Failed to submit message" });
  }
});

// Provider creates a support request from the provider portal.
router.post(
  "/provider/support-requests",
  supportLimiter,
  requireAuth,
  requireRole("provider"),
  async (req, res) => {
    try {
      const userId = req.session.user.id;

      const provider = await query(
        `SELECT id, email, display_name
         FROM users
         WHERE id=$1 AND role='provider' AND status='active'`,
        [userId],
      );

      if (provider.rowCount === 0) {
        return res.status(404).json({ error: "Provider not found" });
      }

      const providerRow = provider.rows[0];
      const name =
        clean(req.body.name) || providerRow.display_name || "Provider";
      const email = normalizeEmail(providerRow.email);
      const category = clean(req.body.category);
      const subject = clean(req.body.subject);
      const description = clean(req.body.description);

      const validationError = validateBaseRequest({
        name,
        email,
        category,
        subject,
        description,
      });

      if (validationError) {
        return res.status(400).json({ error: validationError });
      }

      const result = await query(
        `WITH created_request AS (
          INSERT INTO support_requests
            (requester_type, requester_user_id, requester_name, requester_email, category, subject, description)
          VALUES
            ('provider', $1, $2, $3, $4, $5, $6)
          RETURNING *
        ), created_message AS (
          INSERT INTO support_request_messages
            (request_id, sender_type, sender_user_id, sender_name, sender_email, message, is_internal)
          SELECT
            id, 'provider', requester_user_id, requester_name, requester_email, description, FALSE
          FROM created_request
          RETURNING id
        )
        SELECT * FROM created_request`,
        [userId, name, email, category, subject, description],
      );

      return res.status(201).json({
        ok: true,
        request: serializeRequest(result.rows[0]),
      });
    } catch (error) {
      console.error("PROVIDER SUPPORT REQUEST ERROR:", error);
      return res
        .status(500)
        .json({ error: "Failed to create support request" });
    }
  },
);

// Provider lists only their own support requests.
router.get(
  "/provider/support-requests",
  requireAuth,
  requireRole("provider"),
  async (req, res) => {
    try {
      const userId = req.session.user.id;

      const result = await query(
        `SELECT
           r.*,
           COUNT(m.id)::int AS message_count
         FROM support_requests r
         LEFT JOIN support_request_messages m
           ON m.request_id = r.id
          AND m.is_internal = FALSE
         WHERE r.requester_type='provider'
           AND r.requester_user_id=$1
         GROUP BY r.id
         ORDER BY r.last_message_at DESC, r.created_at DESC`,
        [userId],
      );

      return res.json({
        requests: result.rows.map(serializeRequest),
      });
    } catch (error) {
      console.error("LIST PROVIDER SUPPORT REQUESTS ERROR:", error);
      return res.status(500).json({ error: "Failed to load support requests" });
    }
  },
);

// Provider opens one request and sees visible conversation notes/messages.
router.get(
  "/provider/support-requests/:id",
  requireAuth,
  requireRole("provider"),
  async (req, res) => {
    try {
      const userId = req.session.user.id;
      const requestId = Number(req.params.id);

      if (!Number.isInteger(requestId) || requestId <= 0) {
        return res.status(400).json({ error: "Invalid request id" });
      }

      const requestResult = await query(
        `SELECT *
         FROM support_requests
         WHERE id=$1
           AND requester_type='provider'
           AND requester_user_id=$2`,
        [requestId, userId],
      );

      if (requestResult.rowCount === 0) {
        return res.status(404).json({ error: "Support request not found" });
      }

      const messagesResult = await query(
        `SELECT *
         FROM support_request_messages
         WHERE request_id=$1
           AND is_internal=FALSE
         ORDER BY created_at ASC, id ASC`,
        [requestId],
      );

      return res.json({
        request: serializeRequest(requestResult.rows[0]),
        messages: messagesResult.rows.map(serializeMessage),
      });
    } catch (error) {
      console.error("GET PROVIDER SUPPORT REQUEST ERROR:", error);
      return res.status(500).json({ error: "Failed to load support request" });
    }
  },
);

// Provider can add follow-up messages, but cannot change request status.
router.post(
  "/provider/support-requests/:id/messages",
  supportLimiter,
  requireAuth,
  requireRole("provider"),
  async (req, res) => {
    try {
      const userId = req.session.user.id;
      const requestId = Number(req.params.id);
      const message = clean(req.body.message);

      if (!Number.isInteger(requestId) || requestId <= 0) {
        return res.status(400).json({ error: "Invalid request id" });
      }

      if (!message || message.length < 2 || message.length > 3000) {
        return res
          .status(400)
          .json({ error: "Message must be 2-3000 characters." });
      }

      const requestResult = await query(
        `SELECT id, status, requester_name, requester_email
         FROM support_requests
         WHERE id=$1
           AND requester_type='provider'
           AND requester_user_id=$2`,
        [requestId, userId],
      );

      if (requestResult.rowCount === 0) {
        return res.status(404).json({ error: "Support request not found" });
      }

      const requestRow = requestResult.rows[0];

      if (!activeStatuses.has(requestRow.status)) {
        return res
          .status(409)
          .json({ error: "This request is already closed." });
      }

      const messageResult = await query(
        `INSERT INTO support_request_messages
          (request_id, sender_type, sender_user_id, sender_name, sender_email, message, is_internal)
         VALUES
          ($1, 'provider', $2, $3, $4, $5, FALSE)
         RETURNING *`,
        [
          requestId,
          userId,
          requestRow.requester_name,
          requestRow.requester_email,
          message,
        ],
      );

      await query(
        `UPDATE support_requests
         SET updated_at=NOW(),
             last_message_at=NOW()
         WHERE id=$1`,
        [requestId],
      );

      return res.status(201).json({
        ok: true,
        message: serializeMessage(messageResult.rows[0]),
      });
    } catch (error) {
      console.error("ADD PROVIDER SUPPORT MESSAGE ERROR:", error);
      return res.status(500).json({ error: "Failed to add message" });
    }
  },
);

export default router;
