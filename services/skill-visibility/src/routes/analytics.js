import express from "express";
import { query } from "../../db.js";
import { requireAuth, requireRole } from "../middleware/requireAuth.js";

const router = express.Router();

router.get(
  "/admin/analytics/summary",
  requireAuth,
  requireRole("admin"),
  async (req, res) => {
    const days = Number(req.query.days || 7);

    const providers = await query(
      `SELECT
       COUNT(*) FILTER (WHERE role='provider') AS providers_total,
       COUNT(*) FILTER (WHERE role='provider' AND status='active') AS providers_active,
       COUNT(*) FILTER (WHERE role='provider' AND status='inactive') AS providers_inactive
     FROM users`,
    );

    const skills = await query(
      `SELECT
       COUNT(*) AS skills_total,
       COUNT(*) FILTER (WHERE status='active') AS skills_active,
       COUNT(*) FILTER (WHERE status='inactive') AS skills_inactive
     FROM skills`,
    );

    const events = await query(
      `SELECT
       COUNT(*) FILTER (WHERE event_type='search') AS searches,
       COUNT(*) FILTER (WHERE event_type='skill_view') AS skill_views,
       COUNT(*) FILTER (WHERE event_type='contact_click') AS contact_clicks
     FROM events
     WHERE occurred_at >= NOW() - ($1::text || ' days')::interval`,
      [days],
    );

    res.json({
      range_days: days,
      providers: providers.rows[0],
      skills: skills.rows[0],
      events: events.rows[0],
    });
  },
);

router.get(
  "/admin/analytics/top-cities",
  requireAuth,
  requireRole("admin"),
  async (req, res) => {
    const days = Number(req.query.days || 7);
    const r = await query(
      `SELECT city, COUNT(*) AS searches
     FROM events
     WHERE event_type='search'
       AND city IS NOT NULL AND city <> ''
       AND occurred_at >= NOW() - ($1::text || ' days')::interval
     GROUP BY city
     ORDER BY searches DESC
     LIMIT 10`,
      [days],
    );
    res.json({ range_days: days, top_cities: r.rows });
  },
);

router.get(
  "/admin/analytics/top-categories",
  requireAuth,
  requireRole("admin"),
  async (req, res) => {
    const days = Number(req.query.days || 7);
    const r = await query(
      `SELECT category, COUNT(*) AS searches
     FROM events
     WHERE event_type='search'
       AND category IS NOT NULL AND category <> ''
       AND occurred_at >= NOW() - ($1::text || ' days')::interval
     GROUP BY category
     ORDER BY searches DESC
     LIMIT 10`,
      [days],
    );
    res.json({ range_days: days, top_categories: r.rows });
  },
);

router.get(
  "/admin/analytics/contact-clicks",
  requireAuth,
  requireRole("admin"),
  async (req, res) => {
    const days = Number(req.query.days || 7);
    const r = await query(
      `SELECT channel, COUNT(*) AS clicks
     FROM events
     WHERE event_type='contact_click'
       AND occurred_at >= NOW() - ($1::text || ' days')::interval
     GROUP BY channel
     ORDER BY clicks DESC`,
      [days],
    );
    res.json({ range_days: days, contact_clicks: r.rows });
  },
);

router.get(
  "/admin/analytics/searches-daily",
  requireAuth,
  requireRole("admin"),
  async (req, res) => {
    const days = Number(req.query.days || 7);
    const r = await query(
      `SELECT DATE(occurred_at) AS day, COUNT(*) AS searches
     FROM events
     WHERE event_type='search'
       AND occurred_at >= NOW() - ($1::text || ' days')::interval
     GROUP BY day
     ORDER BY day ASC`,
      [days],
    );
    res.json({ range_days: days, searches_daily: r.rows });
  },
);

export default router;
