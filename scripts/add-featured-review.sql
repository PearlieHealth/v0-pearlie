-- Add featured_review column to clinics table
-- This allows clinics to highlight a specific review quote on their public profile
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS featured_review TEXT DEFAULT NULL;
