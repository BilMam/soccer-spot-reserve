-- Fix remote schema: Add missing columns to owners table
ALTER TABLE owners 
ADD COLUMN IF NOT EXISTS phone TEXT NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS mobile_money TEXT NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS cinetpay_contact_id TEXT;

-- Update existing owners to have mobile_money = phone  
UPDATE owners SET mobile_money = phone WHERE mobile_money = '' OR mobile_money IS NULL;

-- Add index for faster CinetPay lookups
CREATE INDEX IF NOT EXISTS idx_owners_cinetpay_contact 
ON owners (cinetpay_contact_id) 
WHERE cinetpay_contact_id IS NOT NULL;