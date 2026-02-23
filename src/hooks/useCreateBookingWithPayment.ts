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
  // Champs Garantie Terrain Bloqué
  paymentType?: 'full' | 'deposit';
  depositAmount?: number;
  depositPublicPrice?: number;
  balanceDue?: number;
  guaranteeCommissionRate?: number;
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
        platformCommission,
        paymentType = 'full',
        depositAmount,
        depositPublicPrice,
        balanceDue,
        guaranteeCommissionRate
      } = params;

      console.log('🔄 Creating booking with params:', params);

      // Calculer les frais opérateurs (3% du prix public APRÈS promo)
      const serviceFee = Math.ceil(publicPrice * 0.03);
      const totalWithFees = publicPrice + serviceFee;

      // Construire l'objet d'insertion
      const bookingInsert: Record<string, any> = {
        field_id: fieldId,
        user_id: userId,
        booking_date: bookingDate.toISOString().split('T')[0],
        start_time: startTime,
        end_time: endTime,

        // ✅ MODÈLE OWNER-FUNDED :
        total_price: publicPrice,
        field_price: netPriceOwner,
        platform_fee_user: 0,
        platform_fee_owner: platformCommission,
        owner_amount: netPriceOwner,

        // Champs promo
        promo_code_id: promoId || null,
        public_before_discount: promoId ? publicPriceBeforePromo : null,
        discount_amount: discountAmount,
        public_after_discount: promoId ? publicPrice : null,

        status: 'pending',
        payment_status: 'pending',
        currency: 'XOF',
        payment_provider: 'paydunya',

        // Champs Garantie Terrain Bloqué
        payment_type: paymentType,
        ...(paymentType === 'deposit' ? {
          deposit_amount: depositAmount,
          deposit_public_price: depositPublicPrice,
          balance_due: balanceDue,
          deposit_paid: false,
          balance_paid: false,
          guarantee_commission_rate: guaranteeCommissionRate
        } : {})
      };

      // Créer la réservation
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .insert(bookingInsert)
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
        amount: totalWithFees,
        field_name: paymentType === 'deposit'
          ? `Acompte Garantie - ${fieldName}`
          : fieldName,
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
