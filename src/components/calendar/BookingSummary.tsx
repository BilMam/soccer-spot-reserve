
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';
import { calculateDuration } from '@/utils/timeUtils';

interface BookingSummaryProps {
  selectedStartTime: string;
  selectedEndTime: string;
  totalPrice: number;
  fieldPrice: number;
  rangeIsAvailable: boolean;
}

const BookingSummary: React.FC<BookingSummaryProps> = ({
  selectedStartTime,
  selectedEndTime,
  totalPrice,
  fieldPrice,
  rangeIsAvailable
}) => {
  const duration = calculateDuration(selectedStartTime, selectedEndTime);

  if (!selectedStartTime || !selectedEndTime) return null;

  return (
    <Card className="bg-gray-50">
      <CardContent className="p-4">
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Durée :</span>
            <span className="font-medium">{duration.display}</span>
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
          <div className="flex justify-between items-center border-t pt-2">
            <span className="text-sm text-gray-600">Prix total :</span>
            <span className="text-lg font-bold text-green-600">
              {totalPrice.toLocaleString()} XOF
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
