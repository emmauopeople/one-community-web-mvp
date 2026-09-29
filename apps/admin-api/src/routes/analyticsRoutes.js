import express from "express";
import requireAdminAuth from "../middleware/requireAdminAuth.js";
import pool from "../db/pool.js";

const router = express.Router();

function getDays(value) {
  const days = Number(value || 7);

  if (!Number.isFinite(days) || days < 1) return 7;
  if (days > 90) return 90;

  return days;
}

router.get("/analytics/events-summary", requireAdminAuth, async (req, res) => {
  try {
    const days = getDays(req.query.days);

    const summaryResult = await pool.query(
      `
      SELECT
        COUNT(*) FILTER (WHERE event_type = 'search')::int AS searches,
        COUNT(*) FILTER (WHERE event_type = 'skill_view')::int AS skill_views,
        COUNT(*) FILTER (
          WHERE event_type IN ('contact_click_whatsapp', 'contact_click_email')
        )::int AS contact_clicks,
        COUNT(*) FILTER (WHERE event_type = 'contact_click_whatsapp')::int AS whatsapp_clicks,
        COUNT(*) FILTER (WHERE event_type = 'contact_click_email')::int AS email_clicks,
        COUNT(*) FILTER (WHERE event_type = 'media_presign')::int AS media_presign,
        COUNT(*) FILTER (WHERE event_type = 'media_confirm')::int AS media_confirm,
        COUNT(*) FILTER (WHERE event_type = 'profile_update')::int AS profile_updates,
        COUNT(*)::int AS total_events
      FROM events
      WHERE occurred_at >= NOW() - ($1::text || ' days')::interval
      `,
      [days],
    );

    const row = summaryResult.rows[0] || {};

    const searches = Number(row.searches || 0);
    const skillViews = Number(row.skill_views || 0);
    const contactClicks = Number(row.contact_clicks || 0);

    const searchToViewRate =
      searches > 0 ? Number(((skillViews / searches) * 100).toFixed(1)) : 0;

    const viewToContactRate =
      skillViews > 0
        ? Number(((contactClicks / skillViews) * 100).toFixed(1))
        : 0;

    return res.status(200).json({
      message: "Event analytics summary fetched successfully",
      days,
      summary: {
        ...row,
        search_to_view_rate: searchToViewRate,
        view_to_contact_rate: viewToContactRate,
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch event analytics summary",
      error: error.message,
    });
  }
});

router.get("/analytics/top-cities", requireAdminAuth, async (req, res) => {
  try {
    const days = getDays(req.query.days);

    const result = await pool.query(
      `
      SELECT
        COALESCE(NULLIF(TRIM(city), ''), 'Unknown') AS city,
        COUNT(*)::int AS searches
      FROM events
      WHERE event_type = 'search'
        AND occurred_at >= NOW() - ($1::text || ' days')::interval
      GROUP BY COALESCE(NULLIF(TRIM(city), ''), 'Unknown')
      ORDER BY searches DESC
      LIMIT 10
      `,
      [days],
    );

    return res.status(200).json({
      message: "Top cities fetched successfully",
      days,
      top_cities: result.rows,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch top cities",
      error: error.message,
    });
  }
});

router.get("/analytics/top-categories", requireAdminAuth, async (req, res) => {
  try {
    const days = getDays(req.query.days);

    const result = await pool.query(
      `
      SELECT
        COALESCE(NULLIF(TRIM(category), ''), 'Unknown') AS category,
        COUNT(*)::int AS searches
      FROM events
      WHERE event_type = 'search'
        AND occurred_at >= NOW() - ($1::text || ' days')::interval
      GROUP BY COALESCE(NULLIF(TRIM(category), ''), 'Unknown')
      ORDER BY searches DESC
      LIMIT 10
      `,
      [days],
    );

    return res.status(200).json({
      message: "Top categories fetched successfully",
      days,
      top_categories: result.rows,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch top categories",
      error: error.message,
    });
  }
});

router.get(
  "/analytics/contact-channels",
  requireAdminAuth,
  async (req, res) => {
    try {
      const days = getDays(req.query.days);

      const result = await pool.query(
        `
  SELECT
    CASE
      WHEN event_type = 'contact_click_whatsapp' THEN 'WhatsApp'
      WHEN event_type = 'contact_click_email' THEN 'Email'
      ELSE 'Other'
    END AS channel,
    COUNT(*)::int AS clicks
  FROM events
  WHERE event_type IN ('contact_click_whatsapp', 'contact_click_email')
    AND occurred_at >= NOW() - ($1::text || ' days')::interval
  GROUP BY
    CASE
      WHEN event_type = 'contact_click_whatsapp' THEN 'WhatsApp'
      WHEN event_type = 'contact_click_email' THEN 'Email'
      ELSE 'Other'
    END
  ORDER BY clicks DESC
  `,
        [days],
      );

      return res.status(200).json({
        message: "Contact channels fetched successfully",
        days,
        contact_channels: result.rows,
      });
    } catch (error) {
      return res.status(500).json({
        message: "Failed to fetch contact channels",
        error: error.message,
      });
    }
  },
);

router.get(
  "/analytics/top-viewed-skills",
  requireAdminAuth,
  async (req, res) => {
    try {
      const days = getDays(req.query.days);

      const result = await pool.query(
        `
      SELECT
        e.skill_id,
        COALESCE(s.title, 'Unknown Skill') AS title,
        COALESCE(s.city, 'Unknown') AS city,
        COALESCE(s.category, 'Unknown') AS category,
        COUNT(*)::int AS views
      FROM events e
      LEFT JOIN skills s
        ON s.id = e.skill_id
      WHERE e.event_type = 'skill_view'
        AND e.occurred_at >= NOW() - ($1::text || ' days')::interval
      GROUP BY e.skill_id, s.title, s.city, s.category
      ORDER BY views DESC
      LIMIT 10
      `,
        [days],
      );

      return res.status(200).json({
        message: "Top viewed skills fetched successfully",
        days,
        top_viewed_skills: result.rows,
      });
    } catch (error) {
      return res.status(500).json({
        message: "Failed to fetch top viewed skills",
        error: error.message,
      });
    }
  },
);

router.get(
  "/analytics/top-contacted-skills",
  requireAdminAuth,
  async (req, res) => {
    try {
      const days = getDays(req.query.days);

      const result = await pool.query(
        `
        SELECT
          e.skill_id,
          COALESCE(s.title, 'Unknown Skill') AS title,
          COALESCE(s.city, 'Unknown') AS city,
          COALESCE(s.category, 'Unknown') AS category,
          COUNT(*)::int AS contacts,
          COUNT(*) FILTER (WHERE e.event_type = 'contact_click_whatsapp')::int AS whatsapp_contacts,
          COUNT(*) FILTER (WHERE e.event_type = 'contact_click_email')::int AS email_contacts
        FROM events e
        LEFT JOIN skills s
          ON s.id = e.skill_id
        WHERE e.event_type IN ('contact_click_whatsapp', 'contact_click_email')
          AND e.occurred_at >= NOW() - ($1::text || ' days')::interval
        GROUP BY e.skill_id, s.title, s.city, s.category
        ORDER BY contacts DESC
        LIMIT 10
        `,
        [days],
      );

      return res.status(200).json({
        message: "Top contacted skills fetched successfully",
        days,
        top_contacted_skills: result.rows,
      });
    } catch (error) {
      return res.status(500).json({
        message: "Failed to fetch top contacted skills",
        error: error.message,
      });
    }
  },
);

router.get("/analytics/daily-activity", requireAdminAuth, async (req, res) => {
  try {
    const days = getDays(req.query.days);

    const result = await pool.query(
      `
      SELECT
        DATE(occurred_at) AS day,
        COUNT(*) FILTER (WHERE event_type = 'search')::int AS searches,
        COUNT(*) FILTER (WHERE event_type = 'skill_view')::int AS skill_views,
        COUNT(*) FILTER (
          WHERE event_type IN ('contact_click_whatsapp', 'contact_click_email')
        )::int AS contact_clicks
      FROM events
      WHERE occurred_at >= NOW() - ($1::text || ' days')::interval
      GROUP BY DATE(occurred_at)
      ORDER BY day ASC
      `,
      [days],
    );

    return res.status(200).json({
      message: "Daily activity fetched successfully",
      days,
      daily_activity: result.rows,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch daily activity",
      error: error.message,
    });
  }
});

export default router;
