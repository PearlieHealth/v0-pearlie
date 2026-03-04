DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM schema_migrations WHERE id = '20260304_120000_create_seo_articles') THEN
    RAISE NOTICE 'Migration already applied, skipping';
    RETURN;
  END IF;

  -- Create seo_articles table for webhook-published content (e.g. Outrank)
  CREATE TABLE IF NOT EXISTS seo_articles (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    content_markdown TEXT NOT NULL,
    content_html TEXT,
    meta_description TEXT,
    image_url TEXT,
    tags TEXT[] DEFAULT '{}',
    source TEXT DEFAULT 'outrank',
    published_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE INDEX IF NOT EXISTS idx_seo_articles_slug ON seo_articles(slug);
  CREATE INDEX IF NOT EXISTS idx_seo_articles_published ON seo_articles(published_at DESC);

  -- Allow public read access (blog is public), restrict writes to service role
  ALTER TABLE seo_articles ENABLE ROW LEVEL SECURITY;

  CREATE POLICY "seo_articles_public_read" ON seo_articles
    FOR SELECT USING (true);

  -- Record migration
  INSERT INTO schema_migrations (id) VALUES ('20260304_120000_create_seo_articles');
END $$;
