-- Add slug column to clinics table for stable, human-readable URLs
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS slug text;

-- Create unique index on slug
CREATE UNIQUE INDEX IF NOT EXISTS clinics_slug_unique ON clinics (slug) WHERE slug IS NOT NULL;

-- Generate slugs for existing clinics based on name
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
WHERE slug IS NULL AND name IS NOT NULL;

-- Handle duplicates by appending postcode
WITH dupes AS (
  SELECT id, slug, postcode,
    ROW_NUMBER() OVER (PARTITION BY slug ORDER BY created_at) as rn
  FROM clinics
  WHERE slug IS NOT NULL
)
UPDATE clinics c
SET slug = c.slug || '-' || LOWER(REGEXP_REPLACE(COALESCE(c.postcode, c.id::text), '[^a-zA-Z0-9]', '', 'g'))
FROM dupes d
WHERE c.id = d.id AND d.rn > 1;
