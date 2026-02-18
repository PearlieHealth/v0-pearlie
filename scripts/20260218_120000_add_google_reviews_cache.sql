DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM schema_migrations WHERE id = '20260218_120000_add_google_reviews_cache') THEN
    RAISE NOTICE 'Migration already applied, skipping';
    RETURN;
  END IF;

  CREATE TABLE IF NOT EXISTS google_reviews_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES clinics(id),
    reviews JSONB NOT NULL DEFAULT '[]',
    fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(clinic_id)
  );

  CREATE INDEX IF NOT EXISTS idx_google_reviews_cache_clinic_id ON google_reviews_cache(clinic_id);

  INSERT INTO schema_migrations (id) VALUES ('20260218_120000_add_google_reviews_cache');
END $$;
