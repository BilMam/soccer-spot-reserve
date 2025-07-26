import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zldawmyoscicxoiqvfpu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsZGF3bXlvc2NpY3hvaXF2ZnB1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTkyNjk0MCwiZXhwIjoyMDY1NTAyOTQwfQ.mTkDcfEtfCMEXip2IYB40Dpt4GZoV4aJvsM2LK70bvc';

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
  console.log('Starting migration...');
  
  try {
    // Test current state
    const { data: testData, error: testError } = await supabase
      .from('owners')
      .select('id, status, approved_by, approved_at')
      .limit(1);
      
    if (testError) {
      console.log('Missing columns detected:', testError.message);
    } else {
      console.log('✅ All columns exist:', Object.keys(testData[0] || {}));
      return;
    }
    
    console.log('❌ Migration needed - please apply manually via Supabase Dashboard SQL Editor:');
    console.log(`
-- Add admin workflow columns
ALTER TABLE owners 
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Create index for status queries
CREATE INDEX IF NOT EXISTS idx_owners_status ON owners (status);

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
BEGIN
  SELECT * INTO owner_record 
  FROM owners 
  WHERE id = owner_id AND status = 'pending';
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Owner not found or already processed'
    );
  END IF;

  UPDATE owners 
  SET 
    status = 'approved',
    approved_at = NOW(),
    updated_at = NOW()
  WHERE id = owner_id;

  RETURN json_build_object(
    'success', true,
    'message', 'Owner approved successfully',
    'owner_id', owner_id,
    'phone', owner_record.phone
  );
END;
$$;
    `);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

applyMigration();