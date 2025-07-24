import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper logging function for enhanced debugging
const logStep = (step: string, details?: any) => {
  const timestamp = new Date().toISOString();
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[${timestamp}] [CREATE-OWNER-CONTACT] ${step}${detailsStr}`);
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
  data?: any;
}

interface OwnerContactData {
  owner_id: string;
  owner_name: string;
  owner_surname: string;
  phone: string;
  email: string;
  country_prefix?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Début de la création du contact propriétaire");

    // Vérifier les variables d'environnement
    const transferLogin = Deno.env.get("CINETPAY_TRANSFER_LOGIN");
    const transferPwd = Deno.env.get("CINETPAY_TRANSFER_PWD");
    const apiBase = Deno.env.get("CINETPAY_API_BASE") || "https://client.cinetpay.com";

    if (!transferLogin || !transferPwd) {
      throw new Error("Variables d'environnement CinetPay Transfer manquantes");
    }

    logStep("Variables d'environnement vérifiées");

    // Initialiser le client Supabase avec service role
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Récupérer les données du body
    const { owner_id, owner_name, owner_surname, phone, email, country_prefix = "225" }: OwnerContactData = await req.json();

    if (!owner_id || !owner_name || !phone || !email) {
      throw new Error("Données propriétaire manquantes : owner_id, owner_name, phone, email requis");
    }

    // Sanitiser le numéro de téléphone - retire +225 et le 0 initial
    const cleanedPhone = phone
      .replace(/^\+?225/, '')  // retire +225
      .replace(/^0/, '');      // retire 0 initial

    logStep("Données propriétaire reçues", { owner_id, owner_name, phone: cleanedPhone.substring(0, 3) + "***" });

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
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Contact déjà existant",
          already_exists: true 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ÉTAPE 1: Authentification CinetPay Transfer
    logStep("Début authentification CinetPay Transfer");
    
    const authResponse = await fetch(`${apiBase}/v1/transfer/auth`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        login: transferLogin,
        pwd: transferPwd
      })
    });

    const authData: CinetPayAuthResponse = await authResponse.json();
    logStep("Réponse authentification CinetPay", { code: authData.code, message: authData.message });

    if (authData.code !== "OPERATION_SUCCES" || !authData.data?.token) {
      throw new Error(`Échec authentification CinetPay: ${authData.message}`);
    }

    const token = authData.data.token;
    logStep("Authentification réussie, token obtenu");

    // ÉTAPE 2: Créer le contact
    logStep("Début création contact CinetPay");
    
    try {
      const contactResponse = await fetch(`${apiBase}/v1/transfer/contact?token=${token}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prefix: country_prefix,
          phone: cleanedPhone,
          name: owner_name,
          surname: owner_surname || "",
          email: email
        })
      });

      const contactData: CinetPayContactResponse = await contactResponse.json();
      logStep("Réponse création contact", { code: contactData.code, message: contactData.message });

      // Traiter les réponses acceptables
      const isSuccess = contactData.code === "OPERATION_SUCCES" || contactData.code === "ERROR_PHONE_ALREADY_MY_CONTACT";

      if (!isSuccess) {
        // Si échec, vérifier si c'est un contact déjà existant
        if (contactData.code === "409" || contactData.message?.includes('PHONE_ALREADY_MY_CONTACT')) {
          logStep("Contact déjà existant - traité comme succès");
          // Continuer avec les données existantes
        } else {
          throw new Error(`Échec création contact CinetPay: ${contactData.message}`);
        }
      }
    } catch (error) {
      // Gérer les erreurs de réseau ou de format de réponse
      if (error.message?.includes('PHONE_ALREADY_MY_CONTACT') || error.message?.includes('409')) {
        logStep("Contact déjà existant détecté dans l'erreur - traité comme succès");
        const contactData = { code: "ERROR_PHONE_ALREADY_MY_CONTACT", message: "Contact already exists" };
      } else {
        throw error;
      }
    }

    // ÉTAPE 3: Mettre à jour la base de données Supabase
    logStep("Mise à jour base de données Supabase");

    const updateData = {
      owner_id,
      payment_provider: 'cinetpay',
      account_type: 'contact',
      owner_name,
      owner_surname: owner_surname || "",
      phone: cleanedPhone,
      email,
      country_prefix,
      cinetpay_contact_added: true,
      cinetpay_contact_status: contactData.message,
      cinetpay_contact_response: contactData,
      updated_at: new Date().toISOString()
    };

    const { error: upsertError } = await supabaseClient
      .from('payment_accounts')
      .upsert(updateData, { 
        onConflict: 'owner_id,payment_provider,account_type'
      });

    if (upsertError) {
      logStep("Erreur mise à jour Supabase", upsertError);
      throw upsertError;
    }

    logStep("Contact créé avec succès", { 
      owner_id, 
      cinetpay_status: contactData.code,
      was_already_existing: contactData.code === "ERROR_PHONE_ALREADY_MY_CONTACT"
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: contactData.code === "ERROR_PHONE_ALREADY_MY_CONTACT" 
          ? "Contact déjà existant dans CinetPay mais enregistré en base"
          : "Contact créé avec succès",
        cinetpay_status: contactData.code,
        owner_id,
        contact_id: contactData.data?.contact_id || null
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERREUR", { message: errorMessage, stack: error instanceof Error ? error.stack : undefined });
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: errorMessage 
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500
      }
    );
  }
});