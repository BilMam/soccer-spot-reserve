
import React from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { SlotValidationLogic } from './SlotValidationLogic';
import { SlotPriceCalculator } from './SlotPriceCalculator';
import { format } from 'date-fns';

interface AvailabilitySlot {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  is_available: boolean;
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
  const priceCalculator = new SlotPriceCalculator(availableSlots, fieldPrice, price1h30, price2h);

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
    
    const priceCalculation = priceCalculator.calculateTotalPriceWithFees(selectedStartTime, selectedEndTime);
    onTimeSlotSelect(selectedDate, selectedStartTime, selectedEndTime, priceCalculation.subtotal, priceCalculation.serviceFee, priceCalculation.total);
  };

  const rangeIsAvailable = validator.isRangeAvailable(selectedStartTime, selectedEndTime);
  const priceCalculation = priceCalculator.calculateTotalPriceWithFees(selectedStartTime, selectedEndTime);

  return (
    <Button
      onClick={handleConfirmBooking}
      disabled={!selectedStartTime || !selectedEndTime || !rangeIsAvailable}
      className="w-full bg-green-600 hover:bg-green-700"
      size="lg"
    >
      Réserver {selectedStartTime && selectedEndTime && `(${priceCalculation.total.toLocaleString()} XOF)`}
    </Button>
  );
};

export default SlotBookingActions;
