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

// Phone number normalization utility
const normalizePhoneNumber = (phone: string): string | null => {
  if (!phone || typeof phone !== 'string') {
    return null;
  }

  // Remove all spaces, dashes, and other non-digit characters except +
  const cleaned = phone.trim().replace(/[\s\-().]/g, '');
  
  // Handle different input formats
  let digits = '';
  
  if (cleaned.startsWith('+225')) {
    // Format: +225XXXXXXXX
    digits = cleaned.substring(4);
  } else if (cleaned.startsWith('225')) {
    // Format: 225XXXXXXXX
    digits = cleaned.substring(3);
  } else if (cleaned.startsWith('0')) {
    // Format: 0XXXXXXXX (local format with leading 0)
    digits = cleaned.substring(1);
  } else if (/^\d{8}$/.test(cleaned)) {
    // Format: XXXXXXXX (8 digits only)
    digits = cleaned;
  } else {
    // Invalid format
    return null;
  }

  // Validate that we have exactly 8 digits
  if (!/^\d{8}$/.test(digits)) {
    return null;
  }

  // Validate Ivorian mobile prefixes (01, 05, 07, 08, 09)
  const firstTwoDigits = digits.substring(0, 2);
  const validPrefixes = ['01', '05', '07', '08', '09'];
  
  if (!validPrefixes.includes(firstTwoDigits)) {
    return null;
  }

  return `+225${digits}`;
};

// Helper function with timeout
const fetchWithTimeout = async (url: string, options: RequestInit, timeoutMs = 15000): Promise<Response> => {
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

    // Normalize phone numbers for consistency
    const normalizedPhone = normalizePhoneNumber(phone);
    const normalizedPhonePayout = phone_payout ? normalizePhoneNumber(phone_payout) : normalizedPhone;

    if (!normalizedPhone) {
      throw new Error('Invalid phone number format. Must be a valid Ivorian mobile number.');
    }

    if (phone_payout && !normalizedPhonePayout) {
      throw new Error('Invalid payout phone number format. Must be a valid Ivorian mobile number.');
    }

    console.log(`[${timestamp}] Normalized phone: ${normalizedPhone}, payout: ${normalizedPhonePayout}`);

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

    // Check if normalized phone number is already used by another application
    const { data: existingPhone } = await supabase
      .from('owner_applications')
      .select('id, user_id, phone')
      .maybeSingle();

    // Since we can't use SQL functions easily, we'll fetch all applications and check in code
    const { data: allApplications } = await supabase
      .from('owner_applications')
      .select('id, user_id, phone');

    if (allApplications) {
      for (const app of allApplications) {
        const appNormalizedPhone = normalizePhoneNumber(app.phone);
        if (appNormalizedPhone === normalizedPhone && app.user_id !== userId) {
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
      }
    }

    // Also check in owners table for duplicates
    const { data: allOwners } = await supabase
      .from('owners')
      .select('id, user_id, phone');

    if (allOwners) {
      for (const owner of allOwners) {
        const ownerNormalizedPhone = normalizePhoneNumber(owner.phone);
        if (ownerNormalizedPhone === normalizedPhone && owner.user_id !== userId) {
          return new Response(
            JSON.stringify({
              success: false,
              message: 'This phone number is already registered by another owner',
              code: 'PHONE_TAKEN'
            }),
            { 
              status: 409,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
        }
      }
    }

    console.log(`[${timestamp}] Creating owner application (awaiting admin approval)`);

    // Create owner application record with normalized phone numbers
    const applicationData = {
      user_id: userId,
      full_name: full_name.trim(),
      phone: normalizedPhone, // Use normalized phone
      phone_payout: normalizedPhonePayout, // Always ensure payout phone is filled
      experience: '', // Default empty experience
      motivation: '', // Default empty motivation
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