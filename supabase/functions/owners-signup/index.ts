import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SignupRequest {
  phone: string;
  otp_validated: boolean;
}

interface SignupResponse {
  success: boolean;
  message: string;
  owner_id?: string;
  cinetpay_contact_id?: string;
  code?: string;
  retryable?: boolean;
}

// Helper function with timeout
const fetchWithTimeout = async (url: string, options: any, timeoutMs = 15000): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeoutMs}ms`);
    }
    throw error;
  }
};

serve(async (req) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [owners-signup] Function started`);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Environment validation
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const cinetpayTransferLogin = Deno.env.get('CINETPAY_TRANSFER_LOGIN');
    const cinetpayTransferPwd = Deno.env.get('CINETPAY_TRANSFER_PWD');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }

    // Test mode if CinetPay credentials are missing
    const isTestMode = !cinetpayTransferLogin || !cinetpayTransferPwd;
    if (isTestMode) {
      console.log(`[${timestamp}] ⚠️ TEST MODE: CinetPay credentials missing - will simulate contact creation`);
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get user from JWT token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Invalid or expired token');
    }

    const userId = user.id;
    console.log(`[${timestamp}] Authenticated user: ${userId}`);
    
    // Parse request
    const { phone, otp_validated }: SignupRequest = await req.json();
    console.log(`[${timestamp}] Processing signup for phone: ${phone}`);

    if (!otp_validated) {
      throw new Error('OTP must be validated before signup');
    }

    // Check if owner already exists
    const { data: existingOwner } = await supabase
      .from('owners')
      .select('id, phone')
      .eq('phone', phone)
      .maybeSingle();

    if (existingOwner) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Owner already exists with this phone number'
        }),
        { 
          status: 409,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`[${timestamp}] Creating pending owner (CinetPay contact will be created on admin approval)`);

    // Create pending owner record (admin will approve and create CinetPay contact)
    const ownerData: any = {
      user_id: userId, // Real authenticated user ID
      phone: phone,
      mobile_money: phone, // Same as phone for "one number" approach
      created_at: new Date().toISOString()
    };

    // Try to add status if column exists, fallback to legacy format
    try {
      ownerData.status = 'pending';
      ownerData.cinetpay_contact_id = null;
      
      console.log(`[${timestamp}] Owner data prepared:`, {
        user_id: ownerData.user_id,
        phone: ownerData.phone,
        status: ownerData.status,
        cinetpay_contact_id: ownerData.cinetpay_contact_id
      });
      
      const { data: newOwner, error: ownerError } = await supabase
        .from('owners')
        .insert(ownerData)
        .select('id')
        .single();

      if (ownerError) throw ownerError;
      
      console.log(`[${timestamp}] ✅ Pending owner created successfully: ${newOwner.id}`);
      
      const response: SignupResponse = {
        success: true,
        message: 'Owner application submitted successfully. Awaiting admin approval.',
        owner_id: newOwner.id,
        code: 'PENDING_APPROVAL',
        retryable: false
      };

      return new Response(
        JSON.stringify(response),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 201 
        }
      );
      
    } catch (insertError: any) {
      // If status column doesn't exist, fallback to legacy format
      if (insertError.code === 'PGRST204' || insertError.message?.includes('status')) {
        console.log(`[${timestamp}] Status column not found, creating legacy owner`);
        
        // Remove status-related fields for legacy insert
        delete ownerData.status;
        delete ownerData.cinetpay_contact_id;
        
        const { data: legacyOwner, error: legacyError } = await supabase
          .from('owners')
          .insert(ownerData)
          .select('id')
          .single();

        if (legacyError) throw legacyError;
        
        console.log(`[${timestamp}] ✅ Legacy owner created successfully: ${legacyOwner.id}`);
        
        const legacyResponse: SignupResponse = {
          success: true,
          message: 'Owner account created successfully.',
          owner_id: legacyOwner.id,
          code: 'APPROVED', // Legacy format treats as immediately approved
          retryable: false
        };

        return new Response(
          JSON.stringify(legacyResponse),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 201 
          }
        );
      } else {
        throw insertError;
      }
    }

  } catch (error) {
    console.error(`[${timestamp}] Error:`, error);
    
    // Determine error code and retryability
    let errorCode = 'UNKNOWN_ERROR';
    let retryable = false;
    let status = 500;
    
    if (error.message.includes('CinetPay contact creation failed')) {
      errorCode = 'CINETPAY_ERROR';
      retryable = true;
      status = 503; // Service Unavailable
    } else if (error.message.includes('already exists')) {
      errorCode = 'DUPLICATE_OWNER';
      retryable = false;
      status = 409; // Conflict
    } else if (error.message.includes('Schema migration required')) {
      errorCode = 'SCHEMA_ERROR';
      retryable = false;
      status = 500;
    } else if (error.message.includes('OTP must be validated')) {
      errorCode = 'OTP_NOT_VALIDATED';
      retryable = true;
      status = 400; // Bad Request
    }
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: error.message,
        code: errorCode,
        retryable: retryable,
        timestamp 
      }),
      { 
        status: status, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});