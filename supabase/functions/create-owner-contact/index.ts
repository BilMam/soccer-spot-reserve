import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CinetPayAuthResponse {
  code: string;
  message: string;
  data?: {
    token: string;
  };
}

interface CinetPayContactResponse {
  code: string;
  message: string;
  data?: {
    contact_id?: string;
  };
}

interface CreateContactRequest {
  owner_id: string;
  owner_name: string;
  owner_surname?: string;
  phone: string;
  email: string;
  country_prefix?: string;
}

interface CreateContactResponse {
  success: boolean;
  contact_id?: string;
  was_already_existing?: boolean;
  error?: string;
  cinetpay_status?: string;
}

// Helper logging function
const logStep = (step: string, details?: any) => {
  const timestamp = new Date().toISOString();
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[${timestamp}] [CREATE-OWNER-CONTACT] ${step}${detailsStr}`);
};

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

export default async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Début de la création du contact propriétaire");

    // Vérifier les variables d'environnement
    const transferLogin = Deno.env.get("CINETPAY_TRANSFER_LOGIN");
    const transferPwd = Deno.env.get("CINETPAY_TRANSFER_PWD");
    const apiBase = "https://api-money-transfer.cinetpay.com";

    // Mode test si credentials manquants
    const isTestMode = !transferLogin || !transferPwd;
    if (isTestMode) {
      logStep("⚠️ MODE TEST: Credentials CinetPay manquants - simulation");
    }

    // Initialiser le client Supabase avec service role
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Récupérer les données du body
    const requestData: CreateContactRequest = await req.json();
    const { 
      owner_id, 
      owner_name, 
      owner_surname = "", 
      phone, 
      email, 
      country_prefix = "225" 
    } = requestData;

    if (!owner_id || !owner_name || !phone || !email) {
      throw new Error("Données manquantes : owner_id, owner_name, phone, email requis");
    }

    logStep("Données propriétaire reçues", { 
      owner_id, 
      owner_name, 
      phone: phone.substring(0, 4) + "***" 
    });

    // Vérifier si le contact a déjà été créé
    const { data: existingAccount, error: fetchError } = await supabaseClient
      .from('payment_accounts')
      .select('*')
      .eq('owner_id', owner_id)
      .eq('payment_provider', 'cinetpay')
      .eq('account_type', 'contact')
      .maybeSingle();

    if (fetchError) {
      logStep("Erreur lors de la vérification du compte existant", fetchError);
      throw fetchError;
    }

    if (existingAccount?.cinetpay_contact_added) {
      logStep("Contact déjà créé pour ce propriétaire", { owner_id });
      
      const response: CreateContactResponse = {
        success: true,
        contact_id: existingAccount.cinetpay_contact_id || `existing_${owner_id}`,
        was_already_existing: true,
        cinetpay_status: existingAccount.cinetpay_contact_status || "ALREADY_EXISTS"
      };

      return new Response(JSON.stringify(response), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    let contactId: string;
    let contactStatus: string;
    let wasAlreadyExisting = false;

    if (!isTestMode) {
      try {
        // ÉTAPE 1: Authentification CinetPay
        logStep("Début authentification CinetPay");
        
        const authResponse = await fetchWithTimeout(`${apiBase}/v2/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            login: transferLogin,
            password: transferPwd
          })
        }, 10000);

        const authData: CinetPayAuthResponse = await authResponse.json();
        logStep("Réponse authentification", { code: authData.code });

        if (authData.code !== "OPERATION_SUCCES" || !authData.data?.token) {
          throw new Error(`Échec authentification CinetPay: ${authData.message}`);
        }

        const token = authData.data.token;
        logStep("Authentification réussie");

        // ÉTAPE 2: Créer le contact
        logStep("Début création contact CinetPay");
        
        // Nettoyer le numéro de téléphone pour CinetPay
        const cleanedPhone = phone.replace(/^\+?225/, '').replace(/^0+/, '');
        
        const contactResponse = await fetchWithTimeout(`${apiBase}/v2/contact`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            prefix: country_prefix,
            phone: cleanedPhone,
            name: owner_name,
            surname: owner_surname,
            email: email
          })
        }, 10000);

        const contactData: CinetPayContactResponse = await contactResponse.json();
        logStep("Réponse création contact", { code: contactData.code });

        // Traiter les réponses acceptables
        const isSuccess = contactData.code === "OPERATION_SUCCES";
        const isAlreadyExists = contactData.code === "ERROR_PHONE_ALREADY_MY_CONTACT";

        if (!isSuccess && !isAlreadyExists) {
          throw new Error(`Échec création contact CinetPay: ${contactData.message}`);
        }

        contactId = contactData.data?.contact_id || `cp_contact_${owner_id}_${Date.now()}`;
        contactStatus = contactData.message;
        wasAlreadyExisting = isAlreadyExists;

        logStep("Contact CinetPay traité", { 
          contactId, 
          wasAlreadyExisting,
          status: contactData.code 
        });

      } catch (error) {
        logStep("ERREUR CinetPay", { error: error.message });
        throw new Error(`Erreur CinetPay: ${error.message}`);
      }
    } else {
      // Mode test - créer un contact fictif
      contactId = `TEST_CONTACT_${owner_id}_${Date.now()}`;
      contactStatus = "TEST_MODE_SUCCESS";
      wasAlreadyExisting = false;
      logStep("⚠️ MODE TEST: Contact fictif créé", { contactId });
    }

    // ÉTAPE 3: Mettre à jour la base de données
    logStep("Mise à jour base de données");

    const accountData = {
      owner_id,
      payment_provider: 'cinetpay',
      account_type: 'contact',
      owner_name,
      owner_surname,
      phone,
      email,
      country_prefix,
      cinetpay_contact_id: contactId,
      cinetpay_contact_added: true,
      cinetpay_contact_status: contactStatus,
      was_already_existing: wasAlreadyExisting,
      cinetpay_contact_response: isTestMode ? { 
        code: "TEST_MODE", 
        message: contactStatus 
      } : undefined,
      updated_at: new Date().toISOString()
    };

    const { error: upsertError } = await supabaseClient
      .from('payment_accounts')
      .upsert(accountData, { 
        onConflict: 'owner_id,payment_provider,account_type'
      });

    if (upsertError) {
      logStep("Erreur mise à jour Supabase", upsertError);
      throw upsertError;
    }

    logStep("Contact créé avec succès", { 
      owner_id, 
      contactId,
      wasAlreadyExisting,
      isTestMode
    });

    const response: CreateContactResponse = {
      success: true,
      contact_id: contactId,
      was_already_existing: wasAlreadyExisting,
      cinetpay_status: contactStatus
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERREUR", { message: errorMessage });
    
    const response: CreateContactResponse = {
      success: false,
      error: errorMessage
    };
    
    return new Response(JSON.stringify(response), { 
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500
    });
  }
};