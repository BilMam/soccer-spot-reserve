import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { buildUrl } from '@/lib/urls';

interface CreateBookingParams {
  fieldId: string;
  fieldName: string;
  userId: string;
  bookingDate: Date;
  startTime: string;
  endTime: string;
  publicPrice: number; // Prix public après promo
  publicPriceBeforePromo?: number; // Prix avant promo (si applicable)
  promoId?: string;
  discountAmount?: number;
  netPriceOwner: number; // Montant net pour le propriétaire
  platformCommission: number; // Commission plateforme
}

/**
 * Hook pour créer une réservation et initialiser le paiement PayDunya
 */
export function useCreateBookingWithPayment() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: CreateBookingParams) => {
      const {
        fieldId,
        fieldName,
        userId,
        bookingDate,
        startTime,
        endTime,
        publicPrice,
        publicPriceBeforePromo,
        promoId,
        discountAmount = 0,
        netPriceOwner,
        platformCommission
      } = params;

      console.log('🔄 Creating booking with params:', params);

      // Calculer les frais opérateurs (3% du prix public après promo)
      const serviceFee = Math.ceil(publicPrice * 0.03);
      const totalWithFees = publicPrice + serviceFee;

      // Créer la réservation
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .insert({
          field_id: fieldId,
          user_id: userId,
          booking_date: bookingDate.toISOString().split('T')[0],
          start_time: startTime,
          end_time: endTime,

          // Nouveau modèle de prix
          total_price: publicPrice, // Prix public (ce que voit le client AVANT frais opérateurs)
          field_price: netPriceOwner, // Prix net pour le propriétaire
          platform_fee_user: 0, // Pas de frais user séparés
          platform_fee_owner: platformCommission, // Commission plateforme
          owner_amount: netPriceOwner, // Montant net EXACT garanti au propriétaire

          // Champs promo (uniquement si promo valide)
          promo_code_id: promoId || null,
          public_before_discount: publicPriceBeforePromo || null,
          discount_amount: discountAmount,
          public_after_discount: promoId ? publicPrice : null,

          status: 'pending',
          payment_status: 'pending',
          currency: 'XOF',
          payment_provider: 'paydunya'
        })
        .select()
        .single();

      if (bookingError) {
        console.error('❌ Booking creation error:', bookingError);
        throw new Error(`Impossible de créer la réservation: ${bookingError.message}`);
      }

      console.log('✅ Booking created:', booking.id);

      // Construire les URLs de retour
      const returnUrl = buildUrl('/mes-reservations');
      const cancelUrl = buildUrl('/mes-reservations');

      // Créer le paiement PayDunya avec le montant FINAL (avec frais opérateurs)
      const paymentRequestData = {
        booking_id: booking.id,
        amount: totalWithFees, // Montant final avec frais opérateurs
        field_name: fieldName,
        date: bookingDate.toLocaleDateString('fr-FR'),
        time: `${startTime} - ${endTime}`,
        return_url: returnUrl,
        cancel_url: cancelUrl
      };

      console.log('💳 Creating PayDunya invoice:', paymentRequestData);

      const { data: paymentData, error: paymentError } = await supabase.functions.invoke('create-paydunya-invoice', {
        body: paymentRequestData
      });

      if (paymentError || !paymentData?.url) {
        const errorMessage = paymentData?.error || paymentError?.message || 'URL de paiement PayDunya non générée';
        console.error('❌ Payment creation error:', errorMessage);
        throw new Error(errorMessage);
      }

      console.log('✅ PayDunya URL generated:', paymentData.url);

      return { booking, paymentUrl: paymentData.url };
    },
    onSuccess: ({ paymentUrl }) => {
      toast({
        title: "🔄 Redirection en cours",
        description: "Vous allez être redirigé vers PayDunya pour finaliser le paiement. Veuillez patienter et ne pas fermer cette page.",
        duration: 3000
      });

      // Rediriger vers PayDunya après un court délai
      setTimeout(() => {
        window.location.href = paymentUrl;
      }, 1500);
    },
    onError: (error: any) => {
      console.error('❌ Booking mutation error:', error);
      toast({
        title: "Erreur de réservation",
        description: error.message || "Une erreur est survenue lors de la création de la réservation.",
        variant: "destructive",
        duration: 5000
      });
    }
  });
}
