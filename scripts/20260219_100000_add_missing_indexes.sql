DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM schema_migrations WHERE id = '20260219_100000_add_missing_indexes') THEN
    RAISE NOTICE 'Migration already applied, skipping';
    RETURN;
  END IF;

  -- Index on messages.sender_type for filtering by sender type
  CREATE INDEX IF NOT EXISTS idx_messages_sender_type ON messages(sender_type);

  -- Index on leads.email for duplicate detection lookups
  CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);

  -- Index on match_results.lead_id for joining match results to leads
  CREATE INDEX IF NOT EXISTS idx_match_results_lead_id ON match_results(lead_id);

  -- Index on matches.lead_id for joining matches to leads
  CREATE INDEX IF NOT EXISTS idx_matches_lead_id ON matches(lead_id);

  -- Record migration
  INSERT INTO schema_migrations (id) VALUES ('20260219_100000_add_missing_indexes');
END $$;
