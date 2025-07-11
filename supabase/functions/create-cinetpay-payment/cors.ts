export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export function handleCorsPreFlight(): Response {
  console.log('✅ Réponse OPTIONS pour CORS');
  return new Response('ok', { headers: corsHeaders });
}