import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [apply-migration] Function started`);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    console.log(`[${timestamp}] Testing database connection...`);

    // Test if status column exists
    const { data: existingOwners, error: testError } = await supabase
      .from('owners')
      .select('id, status')
      .limit(1);

    if (testError && testError.code === 'PGRST203') {
      console.log(`[${timestamp}] Status column not found - migration needed`);
      throw new Error('Status column missing - full migration needed');
    } else if (!testError) {
      console.log(`[${timestamp}] ✅ Status column exists`);
    } else {
      throw testError;
    }

    // Test if admin workflow columns exist
    const { data: adminTest, error: adminError } = await supabase
      .from('owners')
      .select('id, approved_by, approved_at, rejection_reason')
      .limit(1);

    if (adminError && adminError.code === '42703') {
      console.log(`[${timestamp}] Admin workflow columns missing - need manual migration`);
      
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Admin workflow columns missing. Please apply the following SQL in Supabase Dashboard SQL Editor:',
          sql: `-- Add admin workflow columns
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
AS \\$\\$
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
\\$\\$;`,
          instructions: [
            "1. Go to https://supabase.com/dashboard/project/zldawmyoscicxoiqvfpu/sql",
            "2. Copy and paste the SQL above",
            "3. Click 'Run' to execute the migration",
            "4. Test the owner signup form again"
          ],
          timestamp
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    } else if (!adminError) {
      console.log(`[${timestamp}] ✅ Admin workflow columns already exist`);
    } else {
      throw adminError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Migration applied successfully',
        timestamp
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error(`[${timestamp}] Migration error:`, error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: error.message,
        timestamp 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});