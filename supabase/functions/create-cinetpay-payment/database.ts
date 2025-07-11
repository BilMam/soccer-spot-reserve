import type { BookingData } from './types.ts';

export async function getBookingData(supabaseClient: any, bookingId: string, userId: string): Promise<BookingData> {
  console.log('📖 Phase 2 - Récupération réservation...');
  const { data: booking, error: bookingError } = await supabaseClient
    .from('bookings')
    .select(`
      *,
      fields!inner(owner_id, name)
    `)
    .eq('id', bookingId)
    .single();

  if (bookingError) {
    console.error('❌ Erreur récupération réservation:', bookingError);
    throw new Error(`Réservation non trouvée: ${bookingError.message}`);
  }

  console.log('✅ Réservation trouvée Phase 2:', {
    id: booking.id,
    user_id: booking.user_id,
    total_price: booking.total_price,
    field_name: booking.fields.name,
    status: booking.status,
    payment_status: booking.payment_status
  });

  // Vérifier que l'utilisateur est propriétaire de la réservation
  if (booking.user_id !== userId) {
    console.error('❌ Utilisateur non autorisé pour cette réservation');
    throw new Error('Non autorisé - cette réservation ne vous appartient pas');
  }

  return booking;
}

export async function updateBookingPayment(
  supabaseClient: any, 
  bookingId: string, 
  transactionId: string, 
  platformFee: number, 
  ownerAmount: number
) {
  console.log('📝 Phase 2 - Mise à jour réservation...');
  const { error: updateError } = await supabaseClient
    .from('bookings')
    .update({
      payment_intent_id: transactionId,
      platform_fee: platformFee,
      owner_amount: ownerAmount,
      payment_status: 'pending',
      status: 'pending',
      updated_at: new Date().toISOString()
    })
    .eq('id', bookingId);

  if (updateError) {
    console.error('❌ Erreur mise à jour réservation Phase 2:', updateError);
    throw updateError;
  }

  console.log('✅ Phase 2 - Réservation mise à jour');
}