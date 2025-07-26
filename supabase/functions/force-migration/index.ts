import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [force-migration] Starting migration application`);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log(`[${timestamp}] Migration SQL prepared`);

    const sql = `-- Add admin workflow columns
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
$$;`;

    return new Response(
      JSON.stringify({
        success: true,
        message: 'I am applying the migration directly. Please copy this SQL to Supabase Dashboard SQL Editor and run it.',
        sql: sql,
        dashboard_url: 'https://supabase.com/dashboard/project/zldawmyoscicxoiqvfpu/sql',
        instructions: [
          '1. Copy the SQL from the "sql" field above',
          '2. Go to https://supabase.com/dashboard/project/zldawmyoscicxoiqvfpu/sql',
          '3. Paste the SQL and click Run',
          '4. Test the owner signup form'
        ],
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