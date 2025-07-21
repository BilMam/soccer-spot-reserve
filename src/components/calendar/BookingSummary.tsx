
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';
import { calculateDuration } from '@/utils/timeUtils';

interface BookingSummaryProps {
  selectedStartTime: string;
  selectedEndTime: string;
  subtotal: number;
  serviceFee: number;
  total: number;
  fieldPrice: number;
  rangeIsAvailable: boolean;
  durationDisplay: string;
}

const BookingSummary: React.FC<BookingSummaryProps> = ({
  selectedStartTime,
  selectedEndTime,
  subtotal,
  serviceFee,
  total,
  fieldPrice,
  rangeIsAvailable,
  durationDisplay
}) => {
  if (!selectedStartTime || !selectedEndTime) return null;

  return (
    <Card className="bg-gray-50">
      <CardContent className="p-4">
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Durée :</span>
            <span className="font-medium">{durationDisplay}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Créneau :</span>
            <span className="font-medium">{selectedStartTime} - {selectedEndTime}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Prix :</span>
            <span className="text-sm text-gray-500">
              {fieldPrice.toLocaleString()} XOF/heure
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Sous-total :</span>
            <span className="text-sm">
              {subtotal.toLocaleString()} XOF
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Frais de service (3%) :</span>
            <span className="text-sm text-gray-600">
              {serviceFee.toLocaleString()} XOF
            </span>
          </div>
          <div className="flex justify-between items-center border-t pt-2">
            <span className="text-sm text-gray-600">Prix total :</span>
            <span className="text-lg font-bold text-green-600">
              {total.toLocaleString()} XOF
            </span>
          </div>
        </div>

        {!rangeIsAvailable && (
          <div className="flex items-center space-x-2 text-red-600 text-sm mt-3 p-2 bg-red-50 rounded">
            <AlertCircle className="w-4 h-4" />
            <span>Certains créneaux dans cette plage ne sont pas disponibles</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BookingSummary;
