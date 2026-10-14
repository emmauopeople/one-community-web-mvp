ALTER TABLE events ADD COLUMN language text CHECK (language IN ('en','fr'));
