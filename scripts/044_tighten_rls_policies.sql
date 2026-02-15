-- 044: Tighten RLS policies on matches and clinic_invites
-- Removes overly permissive public policies that allow unauthenticated writes

-- =============================================================
-- matches table: Drop public UPDATE (no client-side code updates matches)
-- Keep public INSERT (used by /api/matches via createClient)
-- Keep public SELECT (used by /api/matches/[matchId] and admin analytics)
-- =============================================================
DROP POLICY IF EXISTS "Allow public update to matches" ON public.matches;

-- =============================================================
-- clinic_invites table: Replace public SELECT with auth-scoped policy
-- Only authenticated clinic users who belong to the clinic can read invites
-- INSERT/DELETE from team page also require clinic membership
-- verify-invite and accept-invite routes use createAdminClient (bypasses RLS)
-- =============================================================
DROP POLICY IF EXISTS "Allow public select on clinic_invites" ON public.clinic_invites;
DROP POLICY IF EXISTS "Allow public insert to clinic_invites" ON public.clinic_invites;
DROP POLICY IF EXISTS "Allow public delete on clinic_invites" ON public.clinic_invites;
DROP POLICY IF EXISTS "Allow public update on clinic_invites" ON public.clinic_invites;

-- Allow authenticated users to SELECT invites for clinics they belong to
CREATE POLICY "clinic_users_select_invites" ON public.clinic_invites
  FOR SELECT USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.clinic_users
      WHERE clinic_users.user_id = auth.uid()
      AND clinic_users.clinic_id = clinic_invites.clinic_id
    )
  );

-- Allow authenticated users to INSERT invites for clinics they belong to
CREATE POLICY "clinic_users_insert_invites" ON public.clinic_invites
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.clinic_users
      WHERE clinic_users.user_id = auth.uid()
      AND clinic_users.clinic_id = clinic_invites.clinic_id
    )
  );

-- Allow authenticated users to DELETE invites for clinics they belong to
CREATE POLICY "clinic_users_delete_invites" ON public.clinic_invites
  FOR DELETE USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.clinic_users
      WHERE clinic_users.user_id = auth.uid()
      AND clinic_users.clinic_id = clinic_invites.clinic_id
    )
  );
