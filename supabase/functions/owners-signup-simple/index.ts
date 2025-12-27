import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SignupResponse {
  success: boolean;
  message: string;
  owner_id?: string;
  note?: string;
}

serve(async (req) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [owners-signup-simple] Function started`);

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
    
    const { phone, otp_validated } = await req.json();
    console.log(`[${timestamp}] Processing signup for phone: ${phone}`);

    if (!otp_validated) {
      throw new Error('OTP must be validated before signup');
    }

    // Check if owner already exists (fallback to user_id for now)
    const { data: existingOwner } = await supabase
      .from('owners')
      .select('id')
      .limit(1)
      .maybeSingle();

    if (existingOwner) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'An owner already exists. Contact admin to add your phone number to existing owner record.'
        }),
        { 
          status: 409,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Create basic owner record with current schema
    const { data: newOwner, error: ownerError } = await supabase
      .from('owners')
      .insert({
        user_id: '22222222-2222-2222-2222-222222222222', // Temporary user_id
        created_at: new Date().toISOString()
      })
      .select('id')
      .single();

    if (ownerError) {
      throw new Error(`Failed to create owner: ${ownerError.message}`);
    }

    console.log(`[${timestamp}] ✅ Owner created successfully: ${newOwner.id}`);

    const response: SignupResponse = {
      success: true,
      message: 'Owner registered successfully (basic version)',
      owner_id: newOwner.id,
      note: 'Phone and CinetPay contact will be added after schema migration'
    };

    return new Response(
      JSON.stringify(response),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 201 
      }
    );

  } catch (error) {
    console.error(`[${timestamp}] Error:`, error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: error instanceof Error ? error.message : String(error),
        timestamp 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
