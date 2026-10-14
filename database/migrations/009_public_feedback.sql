CREATE TABLE public_feedback (
 id bigserial PRIMARY KEY, submission_id uuid NOT NULL UNIQUE,
 kind text NOT NULL CHECK(kind IN ('report','survey')),
 category text CHECK(category IN ('app_problem','suggestion','application_comment','provider_problem')),
 subject text NOT NULL DEFAULT '' CHECK(length(subject)<=180),
 description text NOT NULL DEFAULT '' CHECK(length(description)<=3000),
 email text, contact_consent boolean NOT NULL DEFAULT false,
 useful boolean, channel text NOT NULL CHECK(channel IN ('web','mobile')),
 language text NOT NULL CHECK(language IN ('en','fr')),
 latitude numeric(6,3), longitude numeric(7,3), location_status text NOT NULL CHECK(location_status IN ('captured','denied','unavailable','not_requested')),
 status text NOT NULL DEFAULT 'new' CHECK(status IN ('new','in_progress','resolved')),
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK ((contact_consent AND email IS NOT NULL) OR (NOT contact_consent AND email IS NULL)),
 CHECK ((location_status='captured' AND latitude IS NOT NULL AND longitude IS NOT NULL AND latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180) OR (location_status<>'captured' AND latitude IS NULL AND longitude IS NULL)),
 CHECK ((kind='report' AND category IS NOT NULL AND length(subject)>=3 AND length(description)>=10) OR (kind='survey' AND useful IS NOT NULL))
);
CREATE INDEX public_feedback_queue ON public_feedback(kind,created_at DESC,id DESC);
CREATE TABLE feedback_replies (
 id bigserial PRIMARY KEY, feedback_id bigint NOT NULL REFERENCES public_feedback(id),
 admin_id bigint NOT NULL REFERENCES admin_users(id), request_id uuid NOT NULL UNIQUE,
 body text NOT NULL CHECK(length(body) BETWEEN 1 AND 3000),
 delivery_status text NOT NULL DEFAULT 'sending' CHECK(delivery_status IN ('sending','sent','failed')),
 created_at timestamptz NOT NULL DEFAULT now(), sent_at timestamptz
);
CREATE INDEX feedback_replies_parent ON feedback_replies(feedback_id,created_at);
