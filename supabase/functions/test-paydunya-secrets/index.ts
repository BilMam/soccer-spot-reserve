import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const timestamp = new Date().toISOString();
    
    // Vérifier toutes les variables d'environnement PayDunya possibles
    const envCheck = {
      PAYDUNYA_MASTER_KEY: !!Deno.env.get('PAYDUNYA_MASTER_KEY'),
      PAYDUNYA_PRIVATE_KEY: !!Deno.env.get('PAYDUNYA_PRIVATE_KEY'),
      PAYDUNYA_TOKEN: !!Deno.env.get('PAYDUNYA_TOKEN'),
      PAYDUNYA_PUBLIC_KEY: !!Deno.env.get('PAYDUNYA_PUBLIC_KEY'),
      PAYDUNYA_MODE: Deno.env.get('PAYDUNYA_MODE'),
      
      // Variantes possibles
      PAYDUNYA_MASTER_KEY_PROD: !!Deno.env.get('PAYDUNYA_MASTER_KEY_PROD'),
      PAYDUNYA_PRIVATE_KEY_PROD: !!Deno.env.get('PAYDUNYA_PRIVATE_KEY_PROD'),
      PAYDUNYA_TOKEN_PROD: !!Deno.env.get('PAYDUNYA_TOKEN_PROD'),
      
      // Longueurs (pour debug)
      masterKeyLength: Deno.env.get('PAYDUNYA_MASTER_KEY')?.length,
      privateKeyLength: Deno.env.get('PAYDUNYA_PRIVATE_KEY')?.length,
      tokenLength: Deno.env.get('PAYDUNYA_TOKEN')?.length,
      publicKeyLength: Deno.env.get('PAYDUNYA_PUBLIC_KEY')?.length,
    };

    console.log(`[${timestamp}] Environment variables check:`, envCheck);

    return new Response(
      JSON.stringify({ 
        status: 'success',
        envCheck,
        timestamp 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );

  } catch (error) {
    console.error('Error in test-paydunya-secrets function:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    );
  }
});