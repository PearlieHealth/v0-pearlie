-- Update availability schema for days and hourly slots
-- Rename availability_slots to available_days and add available_hours
-- Rename accepts_urgent to accepts_same_day

-- Add new columns
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS available_days jsonb DEFAULT '["mon", "tue", "wed", "thu", "fri"]'::jsonb;
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS available_hours jsonb DEFAULT '["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"]'::jsonb;
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS accepts_same_day boolean DEFAULT true;

-- Migrate existing data from availability_slots if it exists
UPDATE clinics 
SET available_days = CASE 
  WHEN availability_slots ? 'weekends' THEN '["mon", "tue", "wed", "thu", "fri", "sat", "sun"]'::jsonb
  ELSE '["mon", "tue", "wed", "thu", "fri"]'::jsonb
END
WHERE availability_slots IS NOT NULL;

-- Migrate accepts_urgent to accepts_same_day
UPDATE clinics 
SET accepts_same_day = COALESCE(accepts_urgent, true)
WHERE accepts_urgent IS NOT NULL;

-- Keep old columns for backward compatibility (can be dropped later)
-- DROP COLUMN availability_slots;
-- DROP COLUMN accepts_urgent;
