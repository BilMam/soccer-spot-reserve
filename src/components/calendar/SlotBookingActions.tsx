
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { SlotValidationLogic } from './SlotValidationLogic';
import { SlotPriceCalculator } from './SlotPriceCalculator';
import { format } from 'date-fns';
import type { FieldPricing } from '@/types/pricing';
import { Loader2, Shield } from 'lucide-react';
import type { calculateGuaranteeBreakdown } from '@/utils/publicPricing';

interface AvailabilitySlot {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  is_available: boolean;
  on_hold_until?: string | null;
  hold_cagnotte_id?: string | null;
  price_override?: number;
  unavailability_reason?: string;
  is_maintenance?: boolean;
  notes?: string;
}

interface SlotBookingActionsProps {
  selectedDate: Date;
  selectedStartTime: string;
  selectedEndTime: string;
  availableSlots: AvailabilitySlot[];
  bookedSlots: string[];
  bookings: Array<{start_time: string, end_time: string}>;
  recurringSlots: any[];
  fieldPrice: number;
  price1h30?: number | null;
  price2h?: number | null;
  promoDiscount?: number;
  promoId?: string;
  paymentType?: 'full' | 'deposit';
  guaranteeBreakdown?: ReturnType<typeof calculateGuaranteeBreakdown> | null;
  onTimeSlotSelect: (
    date: Date,
    startTime: string,
    endTime: string,
    subtotal: number,
    serviceFee: number,
    total: number,
    promoId?: string,
    discountAmount?: number,
    paymentType?: 'full' | 'deposit',
    guaranteeBreakdown?: ReturnType<typeof calculateGuaranteeBreakdown>
  ) => void;
}

const SlotBookingActions: React.FC<SlotBookingActionsProps> = ({
  selectedDate,
  selectedStartTime,
  selectedEndTime,
  availableSlots,
  bookedSlots,
  bookings,
  recurringSlots,
  fieldPrice,
  price1h30,
  price2h,
  promoDiscount = 0,
  promoId,
  paymentType = 'full',
  guaranteeBreakdown,
  onTimeSlotSelect
}) => {
  const { toast } = useToast();
  const [isBooking, setIsBooking] = useState(false);

  const dateStr = format(selectedDate, 'yyyy-MM-dd');
  const validator = new SlotValidationLogic(availableSlots, bookedSlots, bookings, recurringSlots, dateStr);
  
  // Créer l'objet pricing pour le calculateur
  const pricing: FieldPricing = {
    public_price_1h: fieldPrice,
    public_price_1h30: price1h30,
    public_price_2h: price2h,
    price_per_hour: fieldPrice,
    price_1h30: price1h30,
    price_2h: price2h
  };
  
  const priceCalculator = new SlotPriceCalculator(pricing);

  const handleConfirmBooking = () => {
    if (isBooking) return; // Protection anti-double-clic
    
    if (!selectedDate || !selectedStartTime || !selectedEndTime) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner une date et des heures.",
        variant: "destructive"
      });
      return;
    }

    // VALIDATION FINALE STRICTE avant confirmation
    if (!validator.isRangeAvailable(selectedStartTime, selectedEndTime)) {
      toast({
        title: "Erreur",
        description: "Cette plage horaire n'est plus disponible. Veuillez sélectionner d'autres heures.",
        variant: "destructive"
      });
      return;
    }
    
    setIsBooking(true);

    // Calculer le prix PUBLIC AVANT promo
    const publicPriceBeforePromo = priceCalculator.calculateTotalPrice(selectedStartTime, selectedEndTime);

    // Appliquer la réduction si promo
    const publicPrice = publicPriceBeforePromo - promoDiscount;

    // Frais opérateurs (3% du prix public APRÈS promo)
    const PAYMENT_OPERATOR_FEE_RATE = 0.03;
    const operatorFee = Math.ceil(publicPrice * PAYMENT_OPERATOR_FEE_RATE);
    const finalTotal = publicPrice + operatorFee;

    // En mode deposit, utiliser les montants de la garantie
    if (paymentType === 'deposit' && guaranteeBreakdown) {
      onTimeSlotSelect(
        selectedDate,
        selectedStartTime,
        selectedEndTime,
        guaranteeBreakdown.depositPublic,
        guaranteeBreakdown.operatorFee,
        guaranteeBreakdown.totalOnline,
        promoId,
        promoDiscount,
        'deposit',
        guaranteeBreakdown
      );
    } else {
      // subtotal = prix public après promo, serviceFee = frais opérateurs, total = final
      onTimeSlotSelect(
        selectedDate,
        selectedStartTime,
        selectedEndTime,
        publicPrice,
        operatorFee,
        finalTotal,
        promoId,
        promoDiscount,
        'full'
      );
    }
  };

  const rangeIsAvailable = validator.isRangeAvailable(selectedStartTime, selectedEndTime);

  // Calculer pour l'affichage (avec promo si applicable)
  const publicPriceBeforePromo = priceCalculator.calculateTotalPrice(selectedStartTime, selectedEndTime);
  const publicPrice = publicPriceBeforePromo - promoDiscount;
  const PAYMENT_OPERATOR_FEE_RATE = 0.03;
  const operatorFee = Math.ceil(publicPrice * PAYMENT_OPERATOR_FEE_RATE);
  const finalTotal = publicPrice + operatorFee;

  // Montant affiché sur le bouton
  const displayTotal = paymentType === 'deposit' && guaranteeBreakdown
    ? guaranteeBreakdown.totalOnline
    : finalTotal;

  return (
    <Button
      onClick={handleConfirmBooking}
      disabled={!selectedStartTime || !selectedEndTime || !rangeIsAvailable || isBooking}
      className="w-full bg-green-600 hover:bg-green-700"
      size="lg"
    >
      {isBooking ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Préparation du paiement...
        </>
      ) : paymentType === 'deposit' ? (
        <>
          <Shield className="w-4 h-4 mr-2" />
          Bloquer le terrain {selectedStartTime && selectedEndTime && `(${displayTotal.toLocaleString()} XOF)`}
        </>
      ) : (
        <>Réserver {selectedStartTime && selectedEndTime && `(${displayTotal.toLocaleString()} XOF)`}</>
      )}
    </Button>
  );
};

export default SlotBookingActions;
