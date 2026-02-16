DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM schema_migrations WHERE id = '20260215_160000_add_match_result_cache_columns') THEN
    RAISE NOTICE 'Migration already applied, skipping';
    RETURN;
  END IF;

  -- Add columns for caching composed reasons and metadata
  -- These allow GET /api/matches/[matchId] to serve cached results without re-scoring
  ALTER TABLE match_results ADD COLUMN IF NOT EXISTS match_reasons_composed text[] DEFAULT '{}';
  ALTER TABLE match_results ADD COLUMN IF NOT EXISTS match_reasons_long text[] DEFAULT '{}';
  ALTER TABLE match_results ADD COLUMN IF NOT EXISTS match_reasons_meta jsonb DEFAULT '{}';
  ALTER TABLE match_results ADD COLUMN IF NOT EXISTS distance_miles numeric;
  ALTER TABLE match_results ADD COLUMN IF NOT EXISTS explanation_version text;
  ALTER TABLE match_results ADD COLUMN IF NOT EXISTS tier text;

  -- Record migration
  INSERT INTO schema_migrations (id) VALUES ('20260215_160000_add_match_result_cache_columns');
END $$;
