ALTER TABLE provider_reviews DROP CONSTRAINT provider_reviews_status_check;
ALTER TABLE provider_reviews ADD CONSTRAINT provider_reviews_status_check CHECK(status IN ('pending','approved','rejected','inactive','deleted'));
ALTER TABLE provider_reviews ADD COLUMN deleted_at timestamptz;
ALTER TABLE provider_reviews ADD COLUMN deleted_by bigint REFERENCES admin_users(id) ON DELETE SET NULL;
