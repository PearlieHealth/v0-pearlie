-- Audit: Find Duplicate Clinic Users
-- ====================================
-- This is a READ-ONLY audit query. It does NOT delete anything.
-- Run it first to review duplicates, then use the cleanup section below.

-- ── 1. Find duplicate clinic_users by email (same email, same clinic) ──
SELECT
  cu.email,
  cu.clinic_id,
  c.name AS clinic_name,
  COUNT(*) AS duplicate_count,
  ARRAY_AGG(cu.id ORDER BY cu.created_at) AS user_ids,
  ARRAY_AGG(cu.created_at ORDER BY cu.created_at) AS created_dates,
  ARRAY_AGG(cu.last_login ORDER BY cu.created_at) AS last_logins,
  ARRAY_AGG(cu.is_active ORDER BY cu.created_at) AS active_flags
FROM clinic_users cu
JOIN clinics c ON c.id = cu.clinic_id
GROUP BY cu.email, cu.clinic_id, c.name
HAVING COUNT(*) > 1
ORDER BY COUNT(*) DESC, c.name;

-- ── 2. Find duplicate clinic_users by email across ALL clinics ─────────
--    (same person registered under multiple clinics — may be intentional)
SELECT
  cu.email,
  COUNT(DISTINCT cu.clinic_id) AS clinic_count,
  ARRAY_AGG(DISTINCT c.name) AS clinic_names,
  COUNT(*) AS total_rows
FROM clinic_users cu
JOIN clinics c ON c.id = cu.clinic_id
GROUP BY cu.email
HAVING COUNT(*) > 1
ORDER BY COUNT(*) DESC;

-- ── 3. Summary stats ──────────────────────────────────────────────────
SELECT
  'Total clinic_users' AS metric, COUNT(*) AS value FROM clinic_users
UNION ALL
SELECT 'Distinct emails', COUNT(DISTINCT email) FROM clinic_users
UNION ALL
SELECT 'Inactive users', COUNT(*) FROM clinic_users WHERE is_active = false
UNION ALL
SELECT 'Users without email', COUNT(*) FROM clinic_users WHERE email IS NULL;

-- ══════════════════════════════════════════════════════════════════════
-- CLEANUP (uncomment ONLY after reviewing the audit results above)
-- This keeps the OLDEST record per (email, clinic_id) and deletes dupes.
-- ══════════════════════════════════════════════════════════════════════

-- DELETE FROM clinic_users
-- WHERE id IN (
--   SELECT cu.id
--   FROM clinic_users cu
--   INNER JOIN (
--     -- Keep the oldest created user per email+clinic combo
--     -- (or the one with the most recent login if created_at is the same)
--     SELECT DISTINCT ON (email, clinic_id) id AS keep_id
--     FROM clinic_users
--     ORDER BY email, clinic_id, last_login DESC NULLS LAST, created_at ASC
--   ) keepers ON keepers.keep_id != cu.id
--   INNER JOIN (
--     -- Only target emails that actually have duplicates
--     SELECT email, clinic_id
--     FROM clinic_users
--     GROUP BY email, clinic_id
--     HAVING COUNT(*) > 1
--   ) dupes ON dupes.email = cu.email AND dupes.clinic_id = cu.clinic_id
-- );

-- After cleanup, verify:
-- SELECT email, clinic_id, COUNT(*) FROM clinic_users GROUP BY email, clinic_id HAVING COUNT(*) > 1;
