-- Migration: Add UNIQUE phone constraints for data integrity
-- This ensures no duplicate phone numbers in the system

-- Step 1: Clean up any duplicate phones before adding constraints
-- Remove duplicate applications (keep the most recent one)
WITH duplicate_applications AS (
  SELECT phone, 
         array_agg(id ORDER BY created_at DESC) as ids
  FROM owner_applications 
  WHERE phone IS NOT NULL 
    AND phone != ''
  GROUP BY phone 
  HAVING COUNT(*) > 1
)
DELETE FROM owner_applications 
WHERE id IN (
  SELECT unnest(ids[2:]) 
  FROM duplicate_applications
);

-- Remove duplicate owners (keep the most recent one, unless approved)
WITH duplicate_owners AS (
  SELECT phone, 
         array_agg(id ORDER BY 
           CASE 
             WHEN status = 'approved' THEN 1 
             WHEN status = 'pending' THEN 2 
             ELSE 3 
           END, 
           created_at DESC
         ) as ids
  FROM owners 
  WHERE phone IS NOT NULL 
    AND phone != ''
  GROUP BY phone 
  HAVING COUNT(*) > 1
)
DELETE FROM owners 
WHERE id IN (
  SELECT unnest(ids[2:]) 
  FROM duplicate_owners
);

-- Step 2: Add partial unique constraint on owner_applications.phone
-- This allows NULL values but ensures non-NULL phones are unique
CREATE UNIQUE INDEX IF NOT EXISTS idx_owner_applications_phone_unique 
ON owner_applications (phone) 
WHERE phone IS NOT NULL AND phone != '';

-- Step 3: Add partial unique constraint on owners.phone
-- This allows NULL values but ensures non-NULL phones are unique
CREATE UNIQUE INDEX IF NOT EXISTS idx_owners_phone_unique 
ON owners (phone) 
WHERE phone IS NOT NULL AND phone != '';

-- Step 4: Add check constraint to ensure phone format consistency
ALTER TABLE owner_applications 
ADD CONSTRAINT IF NOT EXISTS chk_owner_applications_phone_format 
CHECK (
  phone IS NULL 
  OR phone = '' 
  OR (phone ~ '^\\+225[0-9]{8,10}$' OR phone ~ '^[0-9]{8,10}$')
);

ALTER TABLE owners 
ADD CONSTRAINT IF NOT EXISTS chk_owners_phone_format 
CHECK (
  phone IS NULL 
  OR phone = '' 
  OR (phone ~ '^\\+225[0-9]{8,10}$' OR phone ~ '^[0-9]{8,10}$')
);

-- Step 5: Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_owner_applications_phone_lookup 
ON owner_applications (phone) 
WHERE phone IS NOT NULL AND phone != '';

CREATE INDEX IF NOT EXISTS idx_owners_phone_lookup 
ON owners (phone) 
WHERE phone IS NOT NULL AND phone != '';

-- Step 6: Add constraint to ensure owner_applications.phone is required
ALTER TABLE owner_applications 
ALTER COLUMN phone SET NOT NULL;

-- Add comment for documentation
COMMENT ON INDEX idx_owner_applications_phone_unique IS 'Ensures unique phone numbers in owner applications (excluding NULL/empty)';
COMMENT ON INDEX idx_owners_phone_unique IS 'Ensures unique phone numbers in owners table (excluding NULL/empty)';

-- Log completion
DO $$
DECLARE
  app_count INTEGER;
  owner_count INTEGER;
BEGIN
  SELECT COUNT(DISTINCT phone) INTO app_count FROM owner_applications WHERE phone IS NOT NULL AND phone != '';
  SELECT COUNT(DISTINCT phone) INTO owner_count FROM owners WHERE phone IS NOT NULL AND phone != '';
  
  RAISE NOTICE 'Phone constraints added. Unique phones - Applications: %, Owners: %', app_count, owner_count;
END $$;