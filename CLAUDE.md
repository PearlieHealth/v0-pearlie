# CLAUDE.md — Instructions for Claude Code sessions

## Project Overview

Pearlie is a dental clinic matching platform built with Next.js + Supabase.
- **Frontend:** Next.js App Router, Tailwind CSS, shadcn/ui
- **Backend:** Supabase (Postgres, Auth, Realtime)
- **Deployment:** Vercel

## Database Migrations — CRITICAL RULES

The database uses a `schema_migrations` tracking table. **Every Claude session that modifies the database MUST follow these rules:**

### Creating a new migration

1. **Use timestamp-based names** (never sequential numbers):
   ```
   YYYYMMDD_HHMMSS_short_description.sql
   ```
   Example: `20260215_143000_add_conversation_archive.sql`

2. **Every migration file must be idempotent** using this template:
   ```sql
   DO $$
   BEGIN
     IF EXISTS (SELECT 1 FROM schema_migrations WHERE id = 'YYYYMMDD_HHMMSS_short_description') THEN
       RAISE NOTICE 'Migration already applied, skipping';
       RETURN;
     END IF;

     -- Your SQL here (use IF NOT EXISTS for DDL)
     ALTER TABLE example ADD COLUMN IF NOT EXISTS new_col TEXT;

     -- Record migration
     INSERT INTO schema_migrations (id) VALUES ('YYYYMMDD_HHMMSS_short_description');
   END $$;
   ```

3. **Place migration files in** `scripts/`

4. **Never reuse old numbered names** (001-046 are legacy). Always use timestamps.

5. **Read `scripts/MIGRATION_GUIDE.md`** for full details.

### Why timestamps?

Multiple Claude sessions work on different branches simultaneously. Sequential numbers cause collisions (e.g., two branches both creating `047_...`). Timestamps are unique per second and eliminate this.

## Environment Variables

Environment variables are configured in Vercel. Key services:
- Supabase (DB, Auth, Realtime)
- Groq (AI/LLM)
- Resend (transactional email)

**Never commit `.env` files or secrets to the repository.**

## Key Directories

- `app/` — Next.js App Router pages and API routes
- `components/` — React components (shadcn/ui based)
- `lib/` — Shared utilities, Supabase client, types
- `scripts/` — SQL migration files and migration guide
- `hooks/` — Custom React hooks
- `utils/` — Utility functions
- `styles/` — Global styles

## Common Commands

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run lint         # Run linter
```
