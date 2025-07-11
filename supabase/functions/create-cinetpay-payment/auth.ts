import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export async function authenticateUser(req: Request) {
  console.log('🔧 Phase 2 - Initialisation client Supabase...');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  console.log('🔧 Variables d\'environnement Supabase:', {
    supabaseUrl: supabaseUrl ? `✅ OK (${supabaseUrl.substring(0, 30)}...)` : '❌ MANQUANT',
    supabaseServiceKey: supabaseServiceKey ? '✅ OK' : '❌ MANQUANT'
  });

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Configuration Supabase manquante - vérifier les variables d\'environnement');
  }

  const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

  console.log('🔐 Phase 2 - Vérification authentification...');
  const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
  console.log('🔐 Auth header présent:', !!authHeader);
  console.log('🔐 Headers disponibles:', [...req.headers.keys()]);
  
  if (!authHeader) {
    throw new Error('Erreur authentification: Auth session missing!');
  }

  const token = authHeader.replace('Bearer ', '');
  console.log('🔐 Token extrait:', token ? 'présent' : 'absent');

  const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
  
  if (authError) {
    console.error('❌ Erreur authentification:', authError);
    throw new Error(`Erreur authentification: ${authError.message}`);
  }

  if (!user) {
    console.error('❌ Utilisateur non authentifié');
    throw new Error('Utilisateur non authentifié');
  }

  console.log('✅ Utilisateur authentifié:', {
    id: user.id,
    email: user.email
  });

  return { user, supabaseClient };
}