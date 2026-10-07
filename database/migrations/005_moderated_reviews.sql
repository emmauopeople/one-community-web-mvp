CREATE TABLE provider_reviews (
 id bigserial PRIMARY KEY,
 provider_id bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 skill_id bigint REFERENCES skills(id) ON DELETE SET NULL,
 reviewer_name varchar(60) NOT NULL CHECK(length(trim(reviewer_name)) BETWEEN 2 AND 60),
 reviewer_email citext NOT NULL,
 rating smallint NOT NULL CHECK(rating BETWEEN 1 AND 5),
 body text NOT NULL CHECK(length(trim(body)) BETWEEN 20 AND 2000),
 publication_consent_at timestamptz NOT NULL DEFAULT now(),
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
 version integer NOT NULL DEFAULT 1,
 reviewed_by bigint REFERENCES admin_users(id) ON DELETE SET NULL,
 reviewed_at timestamptz, approved_at timestamptz,
 verification_notes text,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(provider_id,reviewer_email)
);
CREATE INDEX provider_reviews_public ON provider_reviews(provider_id,status,approved_at DESC,id DESC);
CREATE INDEX provider_reviews_queue ON provider_reviews(status,created_at,id);
