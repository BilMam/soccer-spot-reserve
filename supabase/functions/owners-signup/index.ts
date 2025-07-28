import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SignupRequest {
  phone: string;
  full_name: string;
  phone_payout?: string;
  otp_validated: boolean;
}

interface SignupResponse {
  success: boolean;
  message: string;
  application_id?: string;
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
    const { phone, full_name, phone_payout, otp_validated }: SignupRequest = await req.json();
    console.log(`[${timestamp}] Processing signup for phone: ${phone}`);

    if (!otp_validated) {
      throw new Error('OTP must be validated before signup');
    }

    if (!full_name || full_name.trim().length < 2) {
      throw new Error('Full name is required (minimum 2 characters)');
    }

    // Check if application already exists for this user
    const { data: existingApplication } = await supabase
      .from('owner_applications')
      .select('id, status, phone')
      .eq('user_id', userId)
      .maybeSingle();

    if (existingApplication) {
      return new Response(
        JSON.stringify({
          success: false,
          message: `Application already exists with status: ${existingApplication.status}`,
          code: 'APPLICATION_EXISTS'
        }),
        { 
          status: 409,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Check if phone number is already used by another application
    const { data: existingPhone } = await supabase
      .from('owner_applications')
      .select('id, user_id')
      .eq('phone', phone)
      .maybeSingle();

    if (existingPhone && existingPhone.user_id !== userId) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'This phone number is already registered by another user',
          code: 'PHONE_TAKEN'
        }),
        { 
          status: 409,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`[${timestamp}] Creating owner application (awaiting admin approval)`);

    // Create owner application record
    const applicationData = {
      user_id: userId,
      full_name: full_name.trim(),
      phone: phone,
      phone_payout: phone_payout || phone, // Use provided payout phone or default to signup phone
      phone_verified_at: new Date().toISOString(), // OTP was validated
      status: 'pending',
      created_at: new Date().toISOString()
    };

    console.log(`[${timestamp}] Application data prepared:`, {
      user_id: applicationData.user_id,
      full_name: applicationData.full_name,
      phone: applicationData.phone,
      status: applicationData.status
    });

    const { data: newApplication, error: applicationError } = await supabase
      .from('owner_applications')
      .insert(applicationData)
      .select('id')
      .single();

    if (applicationError) {
      console.error(`[${timestamp}] Error creating application:`, applicationError);
      throw applicationError;
    }

    console.log(`[${timestamp}] ✅ Owner application created successfully: ${newApplication.id}`);

    const response: SignupResponse = {
      success: true,
      message: 'Votre demande a été soumise avec succès. Elle est en attente de validation par un administrateur.',
      application_id: newApplication.id,
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
    } else if (error.message.includes('already exists') || error.message.includes('APPLICATION_EXISTS')) {
      errorCode = 'DUPLICATE_APPLICATION';
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