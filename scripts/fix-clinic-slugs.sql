-- Step 0: Add slug column if it doesn't exist (first migration may have failed)
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS slug text;

-- Drop the unique index if it exists (so we can regenerate slugs cleanly)
DROP INDEX IF EXISTS clinics_slug_unique;

-- Reset all slugs to regenerate
UPDATE clinics SET slug = NULL;

-- Step 1: Generate base slugs from name
UPDATE clinics
SET slug = LOWER(
  REGEXP_REPLACE(
    REGEXP_REPLACE(
      REGEXP_REPLACE(
        TRIM(name),
        '[^a-zA-Z0-9\s-]', '', 'g'
      ),
      '\s+', '-', 'g'
    ),
    '-+', '-', 'g'
  )
)
WHERE name IS NOT NULL;

-- Step 2: Deduplicate by appending a row number suffix for duplicates
WITH ranked AS (
  SELECT id, slug,
    ROW_NUMBER() OVER (PARTITION BY slug ORDER BY created_at, id) as rn
  FROM clinics
  WHERE slug IS NOT NULL
)
UPDATE clinics c
SET slug = c.slug || '-' || d.rn
FROM ranked d
WHERE c.id = d.id AND d.rn > 1;

-- Step 3: Now create the unique index
CREATE UNIQUE INDEX clinics_slug_unique ON clinics (slug) WHERE slug IS NOT NULL;
