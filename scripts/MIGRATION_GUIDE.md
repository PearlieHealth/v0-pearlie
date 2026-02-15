# Migration System Guide

## The Problem (Pre-Feb 2026)

The `scripts/` directory had 50+ SQL files numbered `001` through `046`, but multiple branches independently picked the same numbers, creating duplicates:

- `002` has 3 files, `003` has 2, `004` has 2, `016` has 2, `032-034` each have 2

Two "mega scripts" (`run_all_migrations.sql`, `run_branch_merge_migrations.sql`) were created as workarounds, effectively becoming the real migration source of truth.

## The Fix

### 1. Migration Tracking Table

Run `000_create_migration_tracking.sql` once on your database. This creates a `schema_migrations` table and backfills all existing migrations as "already applied".

### 2. Rules for New Migrations Going Forward

**Naming:** Use timestamp-based names, not sequential numbers:

```
YYYYMMDD_HHMMSS_short_description.sql
```

Example: `20260215_143000_add_conversation_archive.sql`

This eliminates number collisions between branches entirely.

**Structure:** Every new migration file must:

```sql
-- Check if already applied
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM schema_migrations WHERE id = '20260215_143000_add_conversation_archive') THEN
    RAISE NOTICE 'Migration already applied, skipping';
    RETURN;
  END IF;

  -- Your migration SQL here
  ALTER TABLE conversations ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

  -- Record migration
  INSERT INTO schema_migrations (id) VALUES ('20260215_143000_add_conversation_archive');
END $$;
```

**Why this works:**
- Timestamps never collide (even across branches)
- `schema_migrations` tracks what's been run
- Each file is self-contained and idempotent
- `IF NOT EXISTS` in DDL provides extra safety
- No need for mega-scripts or manual ordering

### 3. How to Run Migrations

**Option A — Manual (current workflow):**
1. Open Supabase SQL Editor
2. Paste the new migration file
3. Click Run
4. The tracking table records it automatically

**Option B — Script runner (future):**
A Node.js script could scan `scripts/` for files not yet in `schema_migrations` and run them in timestamp order. This is what tools like Flyway/golang-migrate do.

### 4. Legacy Files

The old numbered files (`001` through `046`) are kept for reference but should NOT be re-run. The `run_all_migrations.sql` file covers everything up to `046`. All future work uses timestamp-based naming.

### 5. What About Supabase CLI Migrations?

If you later adopt `supabase migration new` (which creates files in `supabase/migrations/`), that's fine — it uses its own tracking table (`supabase_migrations.schema_migrations`). The two systems won't conflict.
