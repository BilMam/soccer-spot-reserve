import { createClient } from '@supabase/supabase-js';

// Configuration Supabase
const supabaseUrl = 'https://zldawmyoscicxoiqvfpu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsZGF3bXlvc2NpY3hvaXF2ZnB1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyMTU2ODU0NywiZXhwIjoyMDM3MTQ0NTQ3fQ.p5InrOqo5K7qd5xCMt8iQVl9Pm87YgA5K7hNY8zQ_u0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRecentBookings() {
  console.log('🔍 Checking recent paid bookings...\n');
  
  try {
    // 1. Lister les réservations récemment payées
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select(`
        id,
        status,
        payment_status,
        payout_sent,
        owner_amount,
        payment_intent_id,
        created_at,
        fields(id, name, owner_id)
      `)
      .eq('payment_status', 'paid')
      .order('created_at', { ascending: false })
      .limit(5);

    if (bookingsError) {
      throw new Error(`Error fetching bookings: ${bookingsError.message}`);
    }

    console.log(`📋 Found ${bookings.length} recent paid bookings:\n`);

    for (const booking of bookings) {
      console.log(`Booking ${booking.id}:`);
      console.log(`  - Status: ${booking.status}`);
      console.log(`  - Payment: ${booking.payment_status}`);
      console.log(`  - Payout sent: ${booking.payout_sent}`);
      console.log(`  - Amount: ${booking.owner_amount} XOF`);
      console.log(`  - Field owner: ${booking.fields?.owner_id}`);
      console.log(`  - Created: ${booking.created_at}`);

      // Check for existing payouts
      const { data: payouts } = await supabase
        .from('payouts')
        .select('id, status, amount_net, created_at, error_message')
        .eq('booking_id', booking.id)
        .order('created_at', { ascending: false });

      if (payouts && payouts.length > 0) {
        console.log(`  📤 Payouts (${payouts.length}):`);
        payouts.forEach(payout => {
          console.log(`    - ID: ${payout.id}`);
          console.log(`    - Status: ${payout.status}`);
          console.log(`    - Amount: ${payout.amount_net} XOF`);
          if (payout.error_message) {
            console.log(`    - Error: ${payout.error_message}`);
          }
          console.log(`    - Created: ${payout.created_at}`);
        });
      } else {
        console.log(`  ❌ No payouts found for this booking`);
      }
      console.log('');
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkRecentBookings();