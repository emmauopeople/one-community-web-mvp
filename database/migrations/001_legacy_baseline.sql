-- Foundation compatibility schema for a NEW local database only.
-- No DROP/TRUNCATE, no imported production data, no implicit seeding.
-- Identity extraction and independent service DB roles follow in batch 02.
CREATE EXTENSION IF NOT EXISTS citext;
CREATE TABLE users (
 id bigserial PRIMARY KEY, email citext NOT NULL UNIQUE, phone text NOT NULL,
 password_hash text NOT NULL, role text NOT NULL CHECK(role IN ('provider','admin')),
 status text NOT NULL DEFAULT 'active' CHECK(status IN ('active','inactive')),
 email_verified boolean NOT NULL DEFAULT false, display_name text, city text,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE pending_registrations (
 id bigserial PRIMARY KEY, email citext NOT NULL UNIQUE, phone text NOT NULL, display_name text,
 password_hash text NOT NULL, otp_hash text NOT NULL, otp_expires_at timestamptz NOT NULL,
 attempts integer NOT NULL DEFAULT 0, resend_count integer NOT NULL DEFAULT 0,
 locked_until timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX pending_registration_expiry ON pending_registrations(otp_expires_at);
CREATE TABLE auth_logs (
 id bigserial PRIMARY KEY, user_id bigint REFERENCES users(id) ON DELETE SET NULL, email citext,
 event_type text NOT NULL CHECK(event_type IN ('provider_register_begin','provider_register_complete','login','logout','admin_create','provider_status_change','profile_update')),
 success boolean NOT NULL, ip inet, user_agent text, details jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE login_attempts (
 email citext PRIMARY KEY, failed_attempts integer NOT NULL DEFAULT 0,
 first_failed_at timestamptz, last_failed_at timestamptz, locked_until timestamptz,
 last_ip inet, last_user_agent text, updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE skills (
 id bigserial PRIMARY KEY, provider_id bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 title text NOT NULL, category text NOT NULL, tags text NOT NULL DEFAULT '', description text NOT NULL,
 country text NOT NULL, region text, city text NOT NULL, area text,
 lat double precision NOT NULL CHECK(lat BETWEEN -90 AND 90), lng double precision NOT NULL CHECK(lng BETWEEN -180 AND 180),
 status text NOT NULL DEFAULT 'active' CHECK(status IN ('active','inactive')),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX skills_provider ON skills(provider_id);
CREATE INDEX skills_visibility_location ON skills(status,country,city);
CREATE INDEX skills_category ON skills(category);
CREATE TABLE events (
 id bigserial PRIMARY KEY,
 event_type text NOT NULL CHECK(event_type IN ('search','skill_view','contact_click','contact_click_whatsapp','contact_click_email','media_presign','media_confirm','profile_update')),
 user_id bigint REFERENCES users(id) ON DELETE SET NULL, skill_id bigint REFERENCES skills(id) ON DELETE SET NULL,
 country text, region text, city text, category text, q text,
 channel text CHECK(channel IN ('whatsapp','call','email')), lat double precision, lng double precision, radius_km double precision,
 ip inet, user_agent text, occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX events_type_time ON events(event_type,occurred_at);
CREATE INDEX events_skill_time ON events(skill_id,occurred_at);
CREATE TABLE skill_media (
 id bigserial PRIMARY KEY, skill_id bigint NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
 provider_id bigint NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 media_type text NOT NULL DEFAULT 'image' CHECK(media_type='image'), bucket text NOT NULL, s3_key text NOT NULL UNIQUE,
 mime_type text NOT NULL, size_bytes bigint NOT NULL CHECK(size_bytes>0), sort_order smallint NOT NULL CHECK(sort_order BETWEEN 0 AND 2),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(skill_id,sort_order)
);
