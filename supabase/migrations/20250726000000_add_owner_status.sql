-- Add owner status workflow
-- Owners must be approved by admin before being active

-- Add status column to owners table
ALTER TABLE owners 
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending' 
CHECK (status IN ('pending', 'approved', 'rejected'));

-- Add columns for admin workflow
ALTER TABLE owners 
ADD COLUMN IF NOT EXISTS phone TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS mobile_money TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS cinetpay_contact_id TEXT,
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Update existing owners to approved status (migration compatibility)
UPDATE owners 
SET status = 'approved', 
    mobile_money = COALESCE(phone, ''),
    approved_at = created_at
WHERE status = 'pending' AND created_at < NOW();

-- Create index for status queries
CREATE INDEX IF NOT EXISTS idx_owners_status ON owners (status);
CREATE INDEX IF NOT EXISTS idx_owners_phone ON owners (phone) WHERE phone != '';

-- Create admin approval function
CREATE OR REPLACE FUNCTION approve_owner(
  owner_id UUID,
  admin_notes TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  owner_record RECORD;
  contact_result JSON;
BEGIN
  -- Verify admin permissions
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND user_type = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied: admin privileges required';
  END IF;

  -- Get owner record
  SELECT * INTO owner_record 
  FROM owners 
  WHERE id = owner_id AND status = 'pending';
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Owner not found or already processed'
    );
  END IF;

  -- Update owner status
  UPDATE owners 
  SET 
    status = 'approved',
    approved_by = auth.uid(),
    approved_at = NOW(),
    updated_at = NOW()
  WHERE id = owner_id;

  -- Return success (CinetPay contact creation will be handled by Edge Function)
  RETURN json_build_object(
    'success', true,
    'message', 'Owner approved successfully',
    'owner_id', owner_id,
    'phone', owner_record.phone
  );
END;
$$;

-- Add comment
COMMENT ON COLUMN owners.status IS 'Owner approval status: pending (awaiting admin approval), approved (active), rejected';
COMMENT ON FUNCTION approve_owner(UUID, TEXT) IS 'Admin function to approve pending owner applications';

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'Owner status workflow migration completed. Owners table now has status management.';
END $$;