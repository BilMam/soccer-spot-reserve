-- MySport Owner-CinetPay Simplification Migration
-- Consolidates phone numbers and CinetPay contacts into owners table

-- Add new columns to owners table
ALTER TABLE owners 
ADD COLUMN IF NOT EXISTS phone TEXT NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS mobile_money TEXT NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS cinetpay_contact_id TEXT;

-- Backfill data from payout_accounts (if exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payout_accounts') THEN
        -- Update owners with data from their active payout accounts
        UPDATE owners 
        SET 
            phone = COALESCE(pa.phone, ''),
            mobile_money = COALESCE(pa.phone, ''),
            cinetpay_contact_id = pa.cinetpay_contact_id
        FROM payout_accounts pa 
        WHERE owners.id = pa.owner_id 
        AND pa.is_active = true;
        
        -- Log the migration
        RAISE NOTICE 'Migrated % owners from payout_accounts', 
            (SELECT COUNT(*) FROM owners WHERE phone != '');
    END IF;
END $$;

-- Clean up obsolete columns from payouts table
ALTER TABLE payouts 
DROP COLUMN IF EXISTS error_message,
DROP COLUMN IF EXISTS payout_attempted_at;

-- Drop the payout_accounts table after migration
DROP TABLE IF EXISTS payout_accounts CASCADE;

-- Add constraints
ALTER TABLE owners 
ALTER COLUMN phone SET NOT NULL,
ALTER COLUMN mobile_money SET NOT NULL;

-- Create index for faster CinetPay lookups
CREATE INDEX IF NOT EXISTS idx_owners_cinetpay_contact 
ON owners (cinetpay_contact_id) 
WHERE cinetpay_contact_id IS NOT NULL;

-- Add comment explaining the new schema
COMMENT ON COLUMN owners.phone IS 'Regular contact phone number';
COMMENT ON COLUMN owners.mobile_money IS 'Mobile money phone number for payouts (may equal phone)';
COMMENT ON COLUMN owners.cinetpay_contact_id IS 'CinetPay contact ID for transfers';

-- Log completion
DO $$
BEGIN
    RAISE NOTICE 'Migration completed: owners table now contains % records with phone numbers', 
        (SELECT COUNT(*) FROM owners WHERE phone != '');
END $$;