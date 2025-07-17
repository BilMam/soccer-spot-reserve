
import React from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { SlotValidationLogic } from './SlotValidationLogic';
import { SlotPriceCalculator } from './SlotPriceCalculator';

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
  fieldPrice: number;
  onTimeSlotSelect: (date: Date, startTime: string, endTime: string, price: number) => void;
}

const SlotBookingActions: React.FC<SlotBookingActionsProps> = ({
  selectedDate,
  selectedStartTime,
  selectedEndTime,
  availableSlots,
  bookedSlots,
  fieldPrice,
  onTimeSlotSelect
}) => {
  const { toast } = useToast();

  const validator = new SlotValidationLogic(availableSlots, bookedSlots);
  const priceCalculator = new SlotPriceCalculator(availableSlots, fieldPrice);

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
    
    const totalPrice = priceCalculator.calculateTotalPrice(selectedStartTime, selectedEndTime);
    onTimeSlotSelect(selectedDate, selectedStartTime, selectedEndTime, totalPrice);
  };

  const rangeIsAvailable = validator.isRangeAvailable(selectedStartTime, selectedEndTime);
  const totalPrice = priceCalculator.calculateTotalPrice(selectedStartTime, selectedEndTime);

  return (
    <Button
      onClick={handleConfirmBooking}
      disabled={!selectedStartTime || !selectedEndTime || !rangeIsAvailable}
      className="w-full bg-green-600 hover:bg-green-700"
      size="lg"
    >
      Réserver {selectedStartTime && selectedEndTime && `(${totalPrice.toLocaleString()} XOF)`}
    </Button>
  );
};

export default SlotBookingActions;
