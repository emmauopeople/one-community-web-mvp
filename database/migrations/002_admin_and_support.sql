CREATE TABLE admin_users (
 id bigserial PRIMARY KEY, full_name text NOT NULL, email citext NOT NULL UNIQUE, password_hash text NOT NULL,
 role text NOT NULL CHECK(role IN ('admin','root_admin')), is_active boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE admin_login_logs (
 id bigserial PRIMARY KEY, admin_user_id bigint REFERENCES admin_users(id) ON DELETE SET NULL,
 email_attempted text, status text NOT NULL CHECK(status IN ('success','failed')), failure_reason text,
 ip_address inet, user_agent text, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE audit_logs (
 id bigserial PRIMARY KEY, actor_admin_id bigint REFERENCES admin_users(id) ON DELETE SET NULL,
 action_type text NOT NULL, target_type text NOT NULL, target_id text, details jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE admin_sessions (sid varchar PRIMARY KEY, sess json NOT NULL, expire timestamp(6) NOT NULL);
CREATE INDEX admin_sessions_expiry ON admin_sessions(expire);
CREATE TABLE support_requests (
 id bigserial PRIMARY KEY, requester_type text NOT NULL CHECK(requester_type IN ('public','provider')),
 requester_user_id bigint REFERENCES users(id) ON DELETE SET NULL,
 requester_name text NOT NULL, requester_email text NOT NULL, category text NOT NULL,
 subject text NOT NULL, description text NOT NULL,
 status text NOT NULL DEFAULT 'incomplete' CHECK(status IN ('incomplete','in_progress','completed','closed','denied')),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), last_message_at timestamptz NOT NULL DEFAULT now(), closed_at timestamptz
);
CREATE TABLE support_request_messages (
 id bigserial PRIMARY KEY, request_id bigint NOT NULL REFERENCES support_requests(id) ON DELETE CASCADE,
 sender_type text NOT NULL CHECK(sender_type IN ('public','provider','admin')),
 sender_user_id bigint REFERENCES users(id) ON DELETE SET NULL, sender_name text, sender_email text,
 message text NOT NULL, is_internal boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX support_requests_status ON support_requests(status,last_message_at);
CREATE INDEX support_messages_request ON support_request_messages(request_id,created_at);
