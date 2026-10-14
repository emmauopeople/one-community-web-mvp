ALTER TABLE skill_media ADD COLUMN thumbnail_s3_key text;
ALTER TABLE skill_media ADD COLUMN thumbnail_size_bytes bigint CHECK (thumbnail_size_bytes > 0);
