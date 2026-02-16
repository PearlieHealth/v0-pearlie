DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM schema_migrations WHERE id = '20260216_120000_tighten_rls_policies') THEN
    RAISE NOTICE 'Migration already applied, skipping';
    RETURN;
  END IF;

  -- ============================================================
  -- MESSAGES: restrict INSERT to authenticated conversation members
  -- ============================================================

  -- Drop any overly permissive insert policy on messages
  DROP POLICY IF EXISTS "Allow insert for authenticated users" ON messages;
  DROP POLICY IF EXISTS "Allow public insert" ON messages;
  DROP POLICY IF EXISTS "messages_insert_policy" ON messages;
  DROP POLICY IF EXISTS "messages_insert_conversation_members" ON messages;

  CREATE POLICY "messages_insert_conversation_members" ON messages
    FOR INSERT TO authenticated
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM conversations c
        WHERE c.id = conversation_id
        AND (
          -- Clinic staff: user belongs to the conversation's clinic
          EXISTS (
            SELECT 1 FROM clinic_users cu
            WHERE cu.user_id = auth.uid()
            AND cu.clinic_id = c.clinic_id
          )
          OR
          -- Patient: user owns the lead in the conversation
          EXISTS (
            SELECT 1 FROM leads l
            WHERE l.id = c.lead_id
            AND l.user_id = auth.uid()
          )
        )
      )
    );

  -- ============================================================
  -- CONVERSATIONS: restrict INSERT to authenticated conversation members
  -- ============================================================

  DROP POLICY IF EXISTS "Allow insert for authenticated users" ON conversations;
  DROP POLICY IF EXISTS "Allow public insert" ON conversations;
  DROP POLICY IF EXISTS "conversations_insert_policy" ON conversations;
  DROP POLICY IF EXISTS "conversations_insert_members" ON conversations;

  CREATE POLICY "conversations_insert_members" ON conversations
    FOR INSERT TO authenticated
    WITH CHECK (
      -- Clinic staff: user belongs to the clinic
      EXISTS (
        SELECT 1 FROM clinic_users cu
        WHERE cu.user_id = auth.uid()
        AND cu.clinic_id = conversations.clinic_id
      )
      OR
      -- Patient: user owns the lead
      EXISTS (
        SELECT 1 FROM leads l
        WHERE l.id = conversations.lead_id
        AND l.user_id = auth.uid()
      )
    );

  -- ============================================================
  -- MATCH_RESULTS: restrict INSERT to service-role only
  -- ============================================================

  DROP POLICY IF EXISTS "Allow insert for authenticated users" ON match_results;
  DROP POLICY IF EXISTS "Allow public insert" ON match_results;
  DROP POLICY IF EXISTS "match_results_insert_policy" ON match_results;
  DROP POLICY IF EXISTS "match_results_service_insert" ON match_results;

  -- No insert policy for anon/authenticated means only service_role can insert

  -- ============================================================
  -- LEAD_ACTIONS: restrict INSERT to authenticated users
  -- ============================================================

  DROP POLICY IF EXISTS "Allow insert for all" ON lead_actions;
  DROP POLICY IF EXISTS "Allow public insert" ON lead_actions;
  DROP POLICY IF EXISTS "lead_actions_insert_policy" ON lead_actions;
  DROP POLICY IF EXISTS "lead_actions_insert_authenticated" ON lead_actions;

  CREATE POLICY "lead_actions_insert_authenticated" ON lead_actions
    FOR INSERT TO authenticated
    WITH CHECK (true);

  -- ============================================================
  -- MATCH_SESSIONS: restrict INSERT/UPDATE to service-role only
  -- ============================================================

  DROP POLICY IF EXISTS "Allow insert for authenticated users" ON match_sessions;
  DROP POLICY IF EXISTS "Allow public insert" ON match_sessions;
  DROP POLICY IF EXISTS "Allow update for authenticated users" ON match_sessions;
  DROP POLICY IF EXISTS "Allow public update" ON match_sessions;
  DROP POLICY IF EXISTS "match_sessions_insert_policy" ON match_sessions;
  DROP POLICY IF EXISTS "match_sessions_update_policy" ON match_sessions;

  -- No insert/update policy for anon/authenticated means only service_role can insert/update

  -- ============================================================
  -- LEADS: add SELECT policies scoped to own user or clinic staff
  -- ============================================================

  DROP POLICY IF EXISTS "leads_select_own" ON leads;
  DROP POLICY IF EXISTS "leads_select_clinic" ON leads;

  -- Patients can see their own lead
  CREATE POLICY "leads_select_own" ON leads
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

  -- Clinic users can see leads matched to their clinic
  CREATE POLICY "leads_select_clinic" ON leads
    FOR SELECT TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM match_results mr
        JOIN clinic_users cu ON cu.clinic_id = mr.clinic_id
        WHERE mr.lead_id = leads.id
        AND cu.user_id = auth.uid()
      )
    );

  -- Record migration
  INSERT INTO schema_migrations (id) VALUES ('20260216_120000_tighten_rls_policies');
END $$;
