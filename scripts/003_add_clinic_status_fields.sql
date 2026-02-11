-- Add capacity_status field to clinics table if not exists
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS capacity_status TEXT DEFAULT 'active';
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;

-- Add comment
COMMENT ON COLUMN clinics.capacity_status IS 'Clinic capacity status: active, paused, or full';
COMMENT ON COLUMN clinics.active IS 'Whether clinic should appear in public results';
