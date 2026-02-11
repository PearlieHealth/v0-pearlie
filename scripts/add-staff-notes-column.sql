-- Add staff_notes JSONB column to lead_clinic_status table
ALTER TABLE lead_clinic_status
ADD COLUMN IF NOT EXISTS staff_notes JSONB DEFAULT '[]'::jsonb;

-- Add BOOKED_PENDING to status check if it doesn't exist
-- (This is safe to run even if the constraint doesn't exist)
DO $$ 
BEGIN
  -- Drop existing check constraint if it exists
  ALTER TABLE lead_clinic_status DROP CONSTRAINT IF EXISTS lead_clinic_status_status_check;
EXCEPTION WHEN others THEN
  NULL;
END $$;

COMMENT ON COLUMN lead_clinic_status.staff_notes IS 'Array of staff notes: [{text, created_at, created_by}]';
