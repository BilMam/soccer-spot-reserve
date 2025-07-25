// Debug script pour reproduire l'erreur d'inscription
console.log('🔍 Debug inscription owner avec 07 00 07 17 78\n');

const SUPABASE_URL = 'https://zldawmyoscicxoiqvfpu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsZGF3bXlvc2NpY3hvaXF2ZnB1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTg2MTI5MDAsImV4cCI6MjAzNDE4ODkwMH0.UvmvZdE9cKgGlhT1WAYb8chDHx8QR5qQmInJ_rNz7ZU';

async function debugSignup() {
  try {
    console.log('1️⃣ Test owners-signup avec 0700071778...');
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/owners-signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({
        phone: '0700071778',
        otp_validated: true
      })
    });
    
    console.log('📊 Response Status:', response.status);
    console.log('📊 Response Headers:', Object.fromEntries(response.headers.entries()));
    
    const result = await response.json();
    console.log('📊 Response Body:', JSON.stringify(result, null, 2));
    
    if (!result.success) {
      console.log('\n❌ ERREUR DÉTECTÉE:');
      console.log('Message:', result.message);
      console.log('Timestamp:', result.timestamp);
      
      // Analyse de l'erreur
      if (result.message.includes('CinetPay')) {
        console.log('\n🔍 DIAGNOSTIC: Erreur CinetPay contact creation');
        console.log('- Vérifier credentials CINETPAY_TRANSFER_LOGIN/PWD');
        console.log('- Possibilité de limitation API ou sandbox');
        console.log('- Format du numéro de téléphone peut être incorrect');
      }
      
      if (result.message.includes('already exists')) {
        console.log('\n🔍 DIAGNOSTIC: Owner existe déjà');
        console.log('- Vérifier table owners pour doublon');
      }
      
      if (result.message.includes('database')) {
        console.log('\n🔍 DIAGNOSTIC: Erreur base de données');
        console.log('- Migration peut être incomplète');
        console.log('- Colonnes manquantes dans table owners');
      }
    } else {
      console.log('\n✅ INSCRIPTION RÉUSSIE');
      console.log('Owner ID:', result.owner_id);
      console.log('CinetPay Contact:', result.cinetpay_contact_id);
    }
    
  } catch (error) {
    console.error('\n💥 ERREUR RÉSEAU:', error.message);
    console.error('Stack:', error.stack);
  }
}

debugSignup();