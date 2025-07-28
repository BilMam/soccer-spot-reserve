-- Migration: Move legacy pending owners to owner_applications table
-- This migration handles legacy owners that were created directly in the owners table

-- Step 1: Create temporary function to migrate legacy owners
CREATE OR REPLACE FUNCTION migrate_legacy_owners()
RETURNS TABLE (
  migrated_count INTEGER,
  error_count INTEGER,
  details JSONB
)
LANGUAGE plpgsql
AS $$
DECLARE
  legacy_owner RECORD;
  profile_record RECORD;
  migrated_count INTEGER := 0;
  error_count INTEGER := 0;
  details JSONB := '[]'::JSONB;
BEGIN
  -- Process each legacy owner with status = 'pending'
  FOR legacy_owner IN 
    SELECT id, user_id, phone, mobile_money, created_at 
    FROM owners 
    WHERE status = 'pending' 
      AND NOT EXISTS (
        SELECT 1 FROM owner_applications 
        WHERE user_id = owners.user_id
      )
  LOOP
    BEGIN
      -- Get profile information
      SELECT full_name, email INTO profile_record
      FROM profiles 
      WHERE id = legacy_owner.user_id;
      
      -- Insert into owner_applications
      INSERT INTO owner_applications (
        user_id,
        full_name,
        phone,
        phone_payout,
        phone_verified_at,
        status,
        created_at,
        updated_at
      ) VALUES (
        legacy_owner.user_id,
        COALESCE(profile_record.full_name, 'Legacy Owner'),
        legacy_owner.phone,
        legacy_owner.mobile_money,
        legacy_owner.created_at, -- Assume verified since it was in owners table
        'pending',
        legacy_owner.created_at,
        NOW()
      );
      
      -- Mark the legacy owner as migrated
      UPDATE owners 
      SET 
        status = 'migrated_legacy',
        updated_at = NOW()
      WHERE id = legacy_owner.id;
      
      migrated_count := migrated_count + 1;
      
      -- Add to details
      details := details || jsonb_build_object(
        'owner_id', legacy_owner.id,
        'user_id', legacy_owner.user_id,
        'phone', legacy_owner.phone,
        'status', 'migrated'
      );
      
    EXCEPTION WHEN OTHERS THEN
      error_count := error_count + 1;
      
      -- Add error to details
      details := details || jsonb_build_object(
        'owner_id', legacy_owner.id,
        'user_id', legacy_owner.user_id,
        'phone', legacy_owner.phone,
        'status', 'error',
        'error_message', SQLERRM
      );
    END;
  END LOOP;
  
  RETURN QUERY SELECT migrated_count, error_count, details;
END;
$$;

-- Step 2: Add migrated_legacy status to owners status enum if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'migrated_legacy' 
      AND enumtypid = (
        SELECT oid FROM pg_type WHERE typname = 'owner_status'
      )
  ) THEN
    -- Add the new enum value
    ALTER TYPE owner_status ADD VALUE 'migrated_legacy';
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- If the enum doesn't exist, we'll handle this differently
  -- Check if we have a constraint instead
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.check_constraints cc ON tc.constraint_name = cc.constraint_name
    WHERE tc.table_name = 'owners' 
      AND tc.constraint_type = 'CHECK'
      AND cc.check_clause LIKE '%status%'
  ) THEN
    -- Drop the existing constraint and recreate it with the new value
    ALTER TABLE owners DROP CONSTRAINT IF EXISTS owners_status_check;
    ALTER TABLE owners ADD CONSTRAINT owners_status_check 
      CHECK (status IN ('pending', 'approved', 'rejected', 'migrated_legacy'));
  END IF;
END$$;

-- Step 3: Execute the migration
SELECT * FROM migrate_legacy_owners();

-- Step 4: Clean up the temporary function
DROP FUNCTION migrate_legacy_owners();

-- Add comment for tracking
COMMENT ON TABLE owner_applications IS 'Owner applications system - replaces direct owners table creation. Legacy owners migrated with status migrated_legacy in owners table.';

-- Log completion
DO $$
DECLARE
  pending_count INTEGER;
  migrated_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO pending_count FROM owners WHERE status = 'pending';
  SELECT COUNT(*) INTO migrated_count FROM owners WHERE status = 'migrated_legacy';
  
  RAISE NOTICE 'Legacy owner migration completed. Remaining pending: %, Migrated: %', pending_count, migrated_count;
END $$;