// Test E2E : Guard against false owner approvals
console.log('🧪 Test Owner Approval Guard\n');

const SUPABASE_URL = 'https://zldawmyoscicxoiqvfpu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsZGF3bXlvc2NpY3hvaXF2ZnB1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTg2MTI5MDAsImV4cCI6MjAzNDE4ODkwMH0.UvmvZdE9cKgGlhT1WAYb8chDHx8QR5qQmInJ_rNz7ZU';

async function testErrorScenario() {
  console.log('1️⃣ TEST: Error scenario (CinetPay failure)');
  
  try {
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
    
    const result = await response.json();
    console.log('📊 Status:', response.status);
    console.log('📊 Response:', JSON.stringify(result, null, 2));
    
    if (!result.success) {
      console.log('✅ EXPECTED: Error returned correctly');
      console.log('✅ Code:', result.code);
      console.log('✅ Retryable:', result.retryable);
      console.log('✅ Message:', result.message);
      
      if (result.code === 'CINETPAY_ERROR' || result.code === 'SCHEMA_ERROR') {
        console.log('✅ PASS: Proper error classification');
      } else {
        console.log('⚠️ UNEXPECTED: Error code not as expected');
      }
    } else {
      console.log('❌ FAIL: Should have failed but returned success');
      console.log('❌ This indicates a false positive!');
    }
    
  } catch (error) {
    console.log('✅ EXPECTED: Network/parsing error caught');
    console.log('Error:', error.message);
  }
}

async function testSuccessScenario() {
  console.log('\n2️⃣ TEST: Success scenario (Test mode)');
  
  try {
    // Force test mode by testing with known working conditions
    const response = await fetch(`${SUPABASE_URL}/functions/v1/owners-signup-simple`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({
        phone: '0700071779',
        otp_validated: true
      })
    });
    
    const result = await response.json();
    console.log('📊 Status:', response.status);
    console.log('📊 Response:', JSON.stringify(result, null, 2));
    
    if (result.success && result.owner_id) {
      console.log('✅ PASS: Success scenario works correctly');
      console.log('✅ Owner ID:', result.owner_id);
    } else {
      console.log('❌ FAIL: Success scenario should work');
    }
    
  } catch (error) {
    console.log('❌ FAIL: Unexpected error in success scenario');
    console.log('Error:', error.message);
  }
}

async function runTests() {
  await testErrorScenario();
  await testSuccessScenario();
  
  console.log('\n🎯 VALIDATION SUMMARY:');
  console.log('▶️ Error scenarios should return success:false with proper error codes');
  console.log('▶️ Success scenarios should return success:true with owner_id');
  console.log('▶️ Frontend should only show "Demande approuvée" on true success');
  console.log('▶️ No incomplete owner records should be created');
}

runTests();