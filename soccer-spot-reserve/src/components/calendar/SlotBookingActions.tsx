
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
  subtotal: number;
  serviceFee: number;
  finalTotal: number;
  onTimeSlotSelect: (date: Date, startTime: string, endTime: string, subtotal: number, serviceFee: number, total: number) => void;
}

const SlotBookingActions: React.FC<SlotBookingActionsProps> = ({
  selectedDate,
  selectedStartTime,
  selectedEndTime,
  availableSlots,
  bookedSlots,
  fieldPrice,
  subtotal,
  serviceFee,
  finalTotal,
  onTimeSlotSelect
}) => {
  const { toast } = useToast();

  const validator = new SlotValidationLogic(availableSlots, bookedSlots);

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
    
    onTimeSlotSelect(selectedDate, selectedStartTime, selectedEndTime, subtotal, serviceFee, finalTotal);
  };

  const rangeIsAvailable = validator.isRangeAvailable(selectedStartTime, selectedEndTime);

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
