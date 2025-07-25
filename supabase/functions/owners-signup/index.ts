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
        });

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
        });

        const contactResult = await contactResponse.json();
        
        if (!contactResult.success) {
          throw new Error(`Failed to create CinetPay contact: ${contactResult.message}`);
        }

        contactId = contactResult.data.contact_id;
        console.log(`[${timestamp}] CinetPay contact created: ${contactId}`);
        
      } catch (error) {
        console.error(`[${timestamp}] CinetPay contact creation failed:`, error);
        throw new Error(`Failed to create CinetPay contact: ${error.message}`);
      }
    } else {
      // Test mode - simulate contact creation
      contactId = `test_contact_${Date.now()}`;
      console.log(`[${timestamp}] ⚠️ TEST MODE: Simulated contact ID: ${contactId}`);
    }

    // Create owner record
    const { data: newOwner, error: ownerError } = await supabase
      .from('owners')
      .insert({
        phone: phone,
        mobile_money: phone, // Same as phone for "one number" approach
        cinetpay_contact_id: contactId
      })
      .select('id')
      .single();

    if (ownerError) {
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