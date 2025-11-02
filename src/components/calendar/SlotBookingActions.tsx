
import React from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { SlotValidationLogic } from './SlotValidationLogic';
import { SlotPriceCalculator } from './SlotPriceCalculator';
import { format } from 'date-fns';
import type { FieldPricing } from '@/types/pricing';

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
  onTimeSlotSelect: (date: Date, startTime: string, endTime: string, subtotal: number, serviceFee: number, total: number) => void;
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
  onTimeSlotSelect
}) => {
  const { toast } = useToast();

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
    
    // Calculer le prix PUBLIC (déjà avec commission 3%)
    const publicPrice = priceCalculator.calculateTotalPrice(selectedStartTime, selectedEndTime);
    
    // Frais opérateurs (3% du prix public)
    const PAYMENT_OPERATOR_FEE_RATE = 0.03;
    const operatorFee = Math.ceil(publicPrice * PAYMENT_OPERATOR_FEE_RATE);
    const finalTotal = publicPrice + operatorFee;
    
    // subtotal = prix public, serviceFee = frais opérateurs, total = final
    onTimeSlotSelect(selectedDate, selectedStartTime, selectedEndTime, publicPrice, operatorFee, finalTotal);
  };

  const rangeIsAvailable = validator.isRangeAvailable(selectedStartTime, selectedEndTime);
  
  // Calculer pour l'affichage
  const publicPrice = priceCalculator.calculateTotalPrice(selectedStartTime, selectedEndTime);
  const PAYMENT_OPERATOR_FEE_RATE = 0.03;
  const operatorFee = Math.ceil(publicPrice * PAYMENT_OPERATOR_FEE_RATE);
  const finalTotal = publicPrice + operatorFee;

  return (
    <Button
      onClick={handleConfirmBooking}
      disabled={!selectedStartTime || !selectedEndTime || !rangeIsAvailable}
      className="w-full bg-green-600 hover:bg-green-700"
      size="lg"
    >
      Réserver {selectedStartTime && selectedEndTime && `(${finalTotal.toLocaleString()} XOF)`}
    </Button>
  );
};

export default SlotBookingActions;
