-- Nullable for existing accounts and older clients. Never guess names from display_name.
ALTER TABLE users ADD COLUMN first_name varchar(60);
ALTER TABLE users ADD COLUMN last_name varchar(60);
ALTER TABLE users ADD COLUMN business_name varchar(60);
ALTER TABLE pending_registrations ADD COLUMN first_name varchar(60);
ALTER TABLE pending_registrations ADD COLUMN last_name varchar(60);
ALTER TABLE pending_registrations ADD COLUMN business_name varchar(60);
