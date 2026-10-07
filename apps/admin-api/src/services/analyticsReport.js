export function reportDays(value = 7) {
  const days = Number(value);
  if (!Number.isInteger(days) || days < 1 || days > 90) throw new Error('Invalid report days');
  return days;
}

// One SQL statement gives all panels the same snapshot and Cameroon calendar boundaries.
export const REPORT_SQL = `
WITH bounds AS (
 SELECT now() AS generated_at, (now() AT TIME ZONE 'Africa/Douala')::date AS end_day,
 (now() AT TIME ZONE 'Africa/Douala')::date - ($1::int - 1) AS start_day
), scoped AS (
 SELECT e.*, (e.occurred_at AT TIME ZONE 'Africa/Douala')::date AS day,
 CASE WHEN event_type='contact_click_whatsapp' THEN 'WhatsApp'
      WHEN event_type='contact_click_email' THEN 'Email'
      WHEN event_type='contact_click' THEN CASE channel WHEN 'whatsapp' THEN 'WhatsApp' WHEN 'email' THEN 'Email' WHEN 'call' THEN 'Call' ELSE 'Other' END END AS contact_channel
 FROM events e CROSS JOIN bounds b
 WHERE e.occurred_at >= b.start_day::timestamp AT TIME ZONE 'Africa/Douala'
 AND e.occurred_at <= b.generated_at
), summary AS (
 SELECT count(*) FILTER(WHERE event_type='search')::int AS searches,
 count(*) FILTER(WHERE event_type='skill_view')::int AS skill_views,
 count(*) FILTER(WHERE contact_channel IS NOT NULL)::int AS contact_clicks,
 count(*) FILTER(WHERE contact_channel='WhatsApp')::int AS whatsapp_clicks,
 count(*) FILTER(WHERE contact_channel='Email')::int AS email_clicks,
 count(*) FILTER(WHERE event_type='search' AND result_count=0)::int AS no_result_searches,
 count(*)::int AS total_events FROM scoped
), cities AS (
 SELECT coalesce(nullif(trim(city),''),'Unknown') AS city, count(*)::int AS searches
 FROM scoped WHERE event_type='search' GROUP BY 1 ORDER BY searches DESC,city LIMIT 10
), categories AS (
 SELECT coalesce(nullif(trim(category),''),'Unknown') AS category, count(*)::int AS searches
 FROM scoped WHERE event_type='search' GROUP BY 1 ORDER BY searches DESC,category LIMIT 10
), channels AS (
 SELECT contact_channel AS channel,count(*)::int AS clicks FROM scoped
 WHERE contact_channel IS NOT NULL GROUP BY 1 ORDER BY clicks DESC,channel
), viewed AS (
 SELECT e.skill_id,coalesce(s.title,'Unknown Skill') AS title,coalesce(s.city,'Unknown') AS city,
 coalesce(s.category,'Unknown') AS category,count(*)::int AS views
 FROM scoped e LEFT JOIN skills s ON s.id=e.skill_id WHERE e.event_type='skill_view'
 GROUP BY e.skill_id,s.title,s.city,s.category ORDER BY views DESC,e.skill_id NULLS LAST LIMIT 10
), contacted AS (
 SELECT e.skill_id,coalesce(s.title,'Unknown Skill') AS title,coalesce(s.city,'Unknown') AS city,
 coalesce(s.category,'Unknown') AS category,count(*)::int AS contacts
 FROM scoped e LEFT JOIN skills s ON s.id=e.skill_id WHERE contact_channel IS NOT NULL
 GROUP BY e.skill_id,s.title,s.city,s.category ORDER BY contacts DESC,e.skill_id NULLS LAST LIMIT 10
), daily AS (
 SELECT to_char(d.day,'YYYY-MM-DD') AS day,
 count(e.id) FILTER(WHERE e.event_type='search')::int AS searches,
 count(e.id) FILTER(WHERE e.event_type='skill_view')::int AS skill_views,
 count(e.id) FILTER(WHERE e.contact_channel IS NOT NULL)::int AS contact_clicks
 FROM bounds b CROSS JOIN LATERAL generate_series(b.start_day::timestamp,b.end_day::timestamp,interval '1 day') d(day)
 LEFT JOIN scoped e ON e.day=d.day::date GROUP BY d.day ORDER BY d.day
)
SELECT json_build_object('days',$1::int,'start_date',to_char(start_day,'YYYY-MM-DD'),
 'end_date',to_char(end_day,'YYYY-MM-DD'),'generated_at',generated_at,'timezone','Africa/Douala') AS range,
 (SELECT row_to_json(summary) FROM summary) AS summary,
 coalesce((SELECT json_agg(cities) FROM cities),'[]') AS top_cities,
 coalesce((SELECT json_agg(categories) FROM categories),'[]') AS top_categories,
 coalesce((SELECT json_agg(channels) FROM channels),'[]') AS contact_channels,
 coalesce((SELECT json_agg(viewed) FROM viewed),'[]') AS top_viewed_skills,
 coalesce((SELECT json_agg(contacted) FROM contacted),'[]') AS top_contacted_skills,
 (SELECT json_agg(daily) FROM daily) AS daily_activity FROM bounds`;

export async function loadAnalyticsReport(db, days) {
  const {rows} = await db.query(REPORT_SQL, [reportDays(days)]);
  const report = rows[0];
  const s = report.summary;
  s.search_to_view_rate = s.searches ? Number((100*s.skill_views/s.searches).toFixed(1)) : 0;
  s.view_to_contact_rate = s.skill_views ? Number((100*s.contact_clicks/s.skill_views).toFixed(1)) : 0;
  return report;
}
