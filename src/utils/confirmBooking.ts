import { supabase } from "@/integrations/supabase/client";

export const forceConfirmBooking = async (bookingId: string) => {
  try {
    console.log('🔧 Confirming booking manually:', bookingId);
    
    const { data, error } = await supabase.functions.invoke('force-confirm-booking', {
      body: { booking_id: bookingId }
    });

    if (error) throw error;
    
    console.log('✅ Booking confirmed:', data);
    return data;
  } catch (error) {
    console.error('❌ Error confirming booking:', error);
    throw error;
  }
};