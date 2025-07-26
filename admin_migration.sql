-- Add admin workflow columns to owners table
ALTER TABLE owners
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Create index for status queries
CREATE INDEX IF NOT EXISTS idx_owners_status ON owners(status);

-- Verify the migration
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'owners' 
  AND column_name IN ('status', 'approved_by', 'approved_at', 'rejection_reason')
ORDER BY column_name;