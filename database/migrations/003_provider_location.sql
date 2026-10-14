-- Preserve existing accounts/listings. They must complete location setup before
-- new publication; the public cutover is explicitly configured at deployment.
ALTER TABLE users ADD COLUMN operating_location jsonb;
ALTER TABLE users ADD COLUMN gps_consent_at timestamptz;
ALTER TABLE users ADD COLUMN gps_consent_version text;
ALTER TABLE users ADD COLUMN gps_consent_withdrawn_at timestamptz;
ALTER TABLE pending_registrations ADD COLUMN operating_location jsonb;
ALTER TABLE pending_registrations ADD COLUMN gps_consent_at timestamptz;
ALTER TABLE pending_registrations ADD COLUMN gps_consent_version text;
ALTER TABLE skills ADD COLUMN division text;
ALTER TABLE skills ADD COLUMN subdivision text;
ALTER TABLE skills ADD COLUMN location_source text NOT NULL DEFAULT 'legacy';
CREATE TABLE provider_location_audit (
 id bigserial PRIMARY KEY, provider_id bigint NOT NULL REFERENCES users(id),
 action text NOT NULL CHECK(action IN ('accepted','updated','withdrawn')),
 consent_version text NOT NULL, occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX skills_discovery_order ON skills(status, created_at DESC, id DESC);

ALTER TABLE events ADD COLUMN result_count integer;
ALTER TABLE events ADD COLUMN search_mode text;
ALTER TABLE events ADD COLUMN area text;
