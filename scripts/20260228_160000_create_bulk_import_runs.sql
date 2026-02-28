DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM schema_migrations WHERE id = '20260228_160000_create_bulk_import_runs') THEN
    RAISE NOTICE 'Migration already applied, skipping';
    RETURN;
  END IF;

  -- Create bulk_import_runs table to track import operations
  CREATE TABLE IF NOT EXISTS public.bulk_import_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
    area TEXT NOT NULL DEFAULT 'London',
    target_count INTEGER NOT NULL DEFAULT 100,
    min_rating DECIMAL(3,2) DEFAULT 4.5,
    min_review_count INTEGER DEFAULT 100,

    -- Progress tracking
    searched_count INTEGER DEFAULT 0,
    imported_count INTEGER DEFAULT 0,
    skipped_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    photos_success_count INTEGER DEFAULT 0,
    photos_failed_count INTEGER DEFAULT 0,
    pricing_success_count INTEGER DEFAULT 0,
    pricing_failed_count INTEGER DEFAULT 0,

    -- Current batch info
    current_neighbourhood TEXT,
    neighbourhoods_completed TEXT[] DEFAULT '{}',

    -- Import details log (JSONB array of per-clinic results)
    import_log JSONB DEFAULT '[]'::jsonb,

    -- Error info
    error_message TEXT,

    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- Allow admin service role full access
  ALTER TABLE public.bulk_import_runs ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "Allow service role full access to bulk_import_runs"
    ON public.bulk_import_runs
    FOR ALL
    USING (true)
    WITH CHECK (true);

  -- Record migration
  INSERT INTO schema_migrations (id) VALUES ('20260228_160000_create_bulk_import_runs');
END $$;
