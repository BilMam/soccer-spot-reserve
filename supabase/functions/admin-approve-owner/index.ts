import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ApprovalRequest {
  owner_id: string;
  admin_notes?: string;
}

interface ApprovalResponse {
  success: boolean;
  message: string;
  owner_id?: string;
  cinetpay_contact_id?: string;
  code?: string;
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
  console.log(`[${timestamp}] [admin-approve-owner] Function started`);

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
    
    // Verify admin permissions via Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Invalid authorization token');
    }

    // Check if user has admin role using the new role system
    const { data: userRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .in('role', ['super_admin', 'admin']);

    if (rolesError) {
      console.error(`[${timestamp}] Error checking user roles:`, rolesError);
      throw new Error('Error checking user permissions');
    }

    if (!userRoles || userRoles.length === 0) {
      throw new Error('Access denied: admin privileges required');
    }

    console.log(`[${timestamp}] Admin ${user.id} authorized for owner approval`);
    
    // Parse request
    const { owner_id, admin_notes }: ApprovalRequest = await req.json();
    console.log(`[${timestamp}] Processing approval for owner: ${owner_id}`);

    // Get pending owner
    const { data: owner, error: ownerError } = await supabase
      .from('owners')
      .select('id, phone, mobile_money, status, user_id')
      .eq('id', owner_id)
      .eq('status', 'pending')
      .single();

    if (ownerError || !owner) {
      throw new Error(`Owner not found or already processed: ${ownerError?.message}`);
    }

    let phoneNumber = owner.phone;
    
    // If no phone in owner table, try to get it from application
    if (!phoneNumber) {
      const { data: application } = await supabase
        .from('owner_applications')
        .select('phone')
        .eq('user_id', owner.user_id)
        .single();
      
      phoneNumber = application?.phone;
    }
    
    if (!phoneNumber) {
      throw new Error('No phone number found for this owner. Please ensure the owner has a valid phone number.');
    }

    console.log(`[${timestamp}] Found pending owner: ${owner.id}, phone: ${phoneNumber}`);

    // Create CinetPay contact
    let contactId: string;
    
    // Clean phone number for CinetPay (remove +225 and leading zeros)
    const cleanedPhone = phoneNumber
      .replace(/^\+?225/, '')
      .replace(/^0+/, '');

    console.log(`[${timestamp}] Phone cleaned: ${phoneNumber} → ${cleanedPhone}`);

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
        }, 10000);

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
          email: `owner-${owner.id}@mysport.ci`,
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
        throw new Error(`CinetPay contact creation failed: ${error.message}`);
      }
    } else {
      // Test mode - simulate contact creation
      contactId = `approved_contact_${owner.id}_${Date.now()}`;
      console.log(`[${timestamp}] ⚠️ TEST MODE: Simulated contact ID: ${contactId}`);
    }

    // Update owner status to approved with contact ID and ensure phone is saved
    const { error: updateError } = await supabase
      .from('owners')
      .update({
        status: 'approved',
        phone: phoneNumber, // Ensure phone is saved
        mobile_money: phoneNumber, // Ensure mobile_money is also set
        cinetpay_contact_id: contactId,
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', owner_id);

    if (updateError) {
      console.error(`[${timestamp}] Failed to update owner status:`, updateError);
      throw new Error(`Failed to approve owner: ${updateError.message}`);
    }

    console.log(`[${timestamp}] ✅ Owner approved successfully: ${owner_id}`);

    const response: ApprovalResponse = {
      success: true,
      message: 'Owner approved successfully',
      owner_id: owner_id,
      cinetpay_contact_id: contactId,
      code: 'APPROVED'
    };

    return new Response(
      JSON.stringify(response),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error(`[${timestamp}] Error:`, error);
    
    // Determine error code
    let errorCode = 'APPROVAL_ERROR';
    let status = 500;
    
    if (error.message.includes('CinetPay contact creation failed')) {
      errorCode = 'CINETPAY_ERROR';
      status = 503; // Service Unavailable
    } else if (error.message.includes('not found or already processed')) {
      errorCode = 'OWNER_NOT_FOUND';
      status = 404;
    }
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: error.message,
        code: errorCode,
        timestamp 
      }),
      { 
        status: status, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});