
import React from 'react';

interface AvailabilitySlot {
  id?: string;
  date: string;
  start_time: string;
  end_time: string;
  is_available: boolean;
  unavailability_reason?: string;
  is_maintenance?: boolean;
  notes?: string;
}

interface SlotStatisticsProps {
  slots: AvailabilitySlot[];
  bookedSlotsCount: number;
  isSlotBooked: (slot: AvailabilitySlot) => boolean;
}

const SlotStatistics: React.FC<SlotStatisticsProps> = ({
  slots,
  bookedSlotsCount,
  isSlotBooked
}) => {
  return (
    <div className="grid grid-cols-3 gap-2 pt-4 border-t">
      <div className="text-center">
        <div className="text-lg font-bold text-green-600">
          {slots.filter(s => s.is_available && !isSlotBooked(s)).length}
        </div>
        <div className="text-xs text-gray-600">Disponibles</div>
      </div>
      <div className="text-center">
        <div className="text-lg font-bold text-blue-600">
          {bookedSlotsCount}
        </div>
        <div className="text-xs text-gray-600">Réservés</div>
      </div>
      <div className="text-center">
        <div className="text-lg font-bold text-red-600">
          {slots.filter(s => !s.is_available).length}
        </div>
        <div className="text-xs text-gray-600">Indisponibles</div>
      </div>
    </div>
  );
};

export default SlotStatistics;
