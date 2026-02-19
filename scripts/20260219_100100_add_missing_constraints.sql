DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM schema_migrations WHERE id = '20260219_100100_add_missing_constraints') THEN
    RAISE NOTICE 'Migration already applied, skipping';
    RETURN;
  END IF;

  -- Add CHECK constraint on match_results.score to ensure it is between 0 and 100
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'match_results_score_range'
      AND conrelid = 'match_results'::regclass
  ) THEN
    ALTER TABLE match_results
      ADD CONSTRAINT match_results_score_range CHECK (score >= 0 AND score <= 100);
  END IF;

  -- Ensure lead_clinic_status.status has a DEFAULT of 'new'
  ALTER TABLE lead_clinic_status
    ALTER COLUMN status SET DEFAULT 'new';

  -- Record migration
  INSERT INTO schema_migrations (id) VALUES ('20260219_100100_add_missing_constraints');
END $$;
