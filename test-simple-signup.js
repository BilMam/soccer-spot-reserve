// Test de la fonction owners-signup-simple
console.log('🧪 Test owners-signup-simple...\n');

const SUPABASE_URL = 'https://zldawmyoscicxoiqvfpu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsZGF3bXlvc2NpY3hvaXF2ZnB1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTg2MTI5MDAsImV4cCI6MjAzNDE4ODkwMH0.UvmvZdE9cKgGlhT1WAYb8chDHx8QR5qQmInJ_rNz7ZU';

async function testSimpleSignup() {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/owners-signup-simple`, {
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
    
    console.log('📊 Status:', response.status);
    const result = await response.json();
    console.log('📊 Response:', JSON.stringify(result, null, 2));
    
    if (result.success) {
      console.log('\n✅ INSCRIPTION RÉUSSIE !');
      console.log('📋 Owner ID:', result.owner_id);
      console.log('📋 Message:', result.message);
      console.log('📋 Note:', result.note);
    } else {
      console.log('\n❌ Échec:', result.message);
    }
    
  } catch (error) {
    console.error('\n💥 Erreur:', error.message);
  }
}

testSimpleSignup();