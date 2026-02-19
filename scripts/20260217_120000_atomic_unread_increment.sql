DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM schema_migrations WHERE id = '20260217_120000_atomic_unread_increment') THEN
    RAISE NOTICE 'Migration already applied, skipping';
    RETURN;
  END IF;

  CREATE OR REPLACE FUNCTION increment_unread(
    p_conversation_id UUID,
    p_sender_type TEXT
  ) RETURNS VOID AS $fn$
  BEGIN
    IF p_sender_type = 'patient' THEN
      UPDATE conversations
      SET unread_by_clinic = true,
          unread_count_clinic = COALESCE(unread_count_clinic, 0) + 1,
          last_message_at = NOW()
      WHERE id = p_conversation_id;
    ELSE
      UPDATE conversations
      SET unread_by_patient = true,
          unread_count_patient = COALESCE(unread_count_patient, 0) + 1,
          last_message_at = NOW()
      WHERE id = p_conversation_id;
    END IF;
  END;
  $fn$ LANGUAGE plpgsql;

  INSERT INTO schema_migrations (id) VALUES ('20260217_120000_atomic_unread_increment');
END $$;
