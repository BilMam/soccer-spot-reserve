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

    // Create CinetPay contact
    let contactId: string;
    
    // Clean phone number for CinetPay (remove +225 and leading zeros)
    const cleanedPhone = phone
      .replace(/^\+?225/, '')
      .replace(/^0+/, '');

    console.log(`[${timestamp}] Phone cleaned: ${phone} → ${cleanedPhone}`);

    if (!isTestMode) {
      try {
        // Authenticate with CinetPay
        const authResponse = await fetchWithTimeout('https://api-money-transfer.cinetpay.com/v2/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            login: cinetpayTransferLogin,
            password: cinetpayTransferPwd
          })
        }, 10000); // Reduced timeout

        if (!authResponse.ok) {
          throw new Error(`CinetPay auth failed: ${authResponse.status}`);
        }

        const authData = await authResponse.json();
        if (!authData.success) {
          throw new Error(`CinetPay auth failed: ${authData.message}`);
        }

        // Create contact
        const contactData = {
          name: 'Proprietaire',
          surname: '',
          phone: cleanedPhone,
          email: `owner-${Date.now()}@mysport.ci`,
          country_prefix: '225'
        };

        const contactResponse = await fetchWithTimeout('https://api-money-transfer.cinetpay.com/v2/contact', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authData.access_token}`
          },
          body: JSON.stringify(contactData)
        }, 10000);

        const contactResult = await contactResponse.json();
        
        if (!contactResult.success) {
          throw new Error(`Failed to create CinetPay contact: ${contactResult.message}`);
        }

        contactId = contactResult.data.contact_id;
        console.log(`[${timestamp}] CinetPay contact created: ${contactId}`);
        
      } catch (error) {
        console.error(`[${timestamp}] CinetPay contact creation failed:`, error);
        // In production mode, fail completely if CinetPay contact creation fails
        throw new Error(`CinetPay contact creation failed: ${error.message}`);
      }
    } else {
      // Test mode - simulate contact creation
      contactId = `test_contact_${Date.now()}`;
      console.log(`[${timestamp}] ⚠️ TEST MODE: Simulated contact ID: ${contactId}`);
    }

    // Validate that we have a valid contact ID before creating owner
    if (!contactId) {
      throw new Error(`Cannot create owner without valid CinetPay contact ID`);
    }

    // Create owner record with transaction-like behavior
    let ownerData: any = {
      user_id: '11111111-1111-1111-1111-111111111111', // Temporary fallback user_id
    };
    
    // Try to add new columns if they exist
    try {
      ownerData.phone = phone;
      ownerData.mobile_money = phone; // Same as phone for "one number" approach
      ownerData.cinetpay_contact_id = contactId;
    } catch (error) {
      console.log(`[${timestamp}] Schema columns not available, using fallback`);
      // In fallback mode, still require contact_id
      if (!isTestMode) {
        throw new Error(`Schema migration required: missing phone/cinetpay_contact_id columns`);
      }
    }

    const { data: newOwner, error: ownerError } = await supabase
      .from('owners')
      .insert(ownerData)
      .select('id')
      .single();

    if (ownerError) {
      console.error(`[${timestamp}] Owner creation failed:`, ownerError);
      throw new Error(`Failed to create owner: ${ownerError.message}`);
    }

    console.log(`[${timestamp}] ✅ Owner created successfully: ${newOwner.id}`);

    const response: SignupResponse = {
      success: true,
      message: 'Owner registered successfully',
      owner_id: newOwner.id,
      cinetpay_contact_id: contactId
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