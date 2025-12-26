import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';

interface PromoInfo {
  discountLabel: string;
  savings: number;
}

interface BookingSummaryProps {
  selectedStartTime: string;
  selectedEndTime: string;
  subtotal: number;
  serviceFee: number;
  total: number;
  fieldPrice: number;
  price1h30?: number | null;
  price2h?: number | null;
  durationMinutes: number;
  rangeIsAvailable: boolean;
  durationDisplay: string;
  promo?: PromoInfo | null;
  originalSubtotal?: number;
}

const BookingSummary: React.FC<BookingSummaryProps> = ({
  selectedStartTime,
  selectedEndTime,
  subtotal,
  serviceFee,
  total,
  fieldPrice,
  price1h30,
  price2h,
  durationMinutes,
  rangeIsAvailable,
  durationDisplay,
  promo,
  originalSubtotal
}) => {
  if (!selectedStartTime || !selectedEndTime) return null;

  const getPriceLabel = () => {
    if (durationMinutes === 60) {
      return `${subtotal.toLocaleString()} XOF/h`;
    } else if (durationMinutes === 90 && price1h30) {
      return `${subtotal.toLocaleString()} XOF/1h30`;
    } else if (durationMinutes === 120 && price2h) {
      return `${subtotal.toLocaleString()} XOF/2h`;
    } else {
      return `${fieldPrice.toLocaleString()} XOF/h`;
    }
  };

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
            <span className="text-sm text-gray-600">Tarif appliqué :</span>
            <span className="text-sm font-medium text-green-700">
              {getPriceLabel()}
            </span>
          </div>
          
          {/* Affichage avec promo */}
          {promo && originalSubtotal ? (
            <>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Sous-total :</span>
                <span className="text-sm line-through text-muted-foreground">
                  {originalSubtotal.toLocaleString()} XOF
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-orange-600">
                  Réduction ({promo.discountLabel}) :
                </span>
                <span className="text-sm text-orange-600 font-medium">
                  -{promo.savings.toLocaleString()} XOF
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Avec promo :</span>
                <span className="text-sm font-bold text-green-600">
                  {subtotal.toLocaleString()} XOF
                </span>
              </div>
            </>
          ) : (
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Sous-total :</span>
              <span className="text-sm">{subtotal.toLocaleString()} XOF</span>
            </div>
          )}
          
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">
              Frais opérateurs (3%) – paiement sécurisé :
            </span>
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
