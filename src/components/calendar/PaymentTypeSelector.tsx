import React, { useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Shield, CreditCard } from 'lucide-react';

interface PaymentTypeSelectorProps {
  paymentMode: 'full' | 'guarantee' | 'both';
  guaranteePercentage: number; // 0.10, 0.20, 0.30, 0.50
  netPriceOwner: number;
  publicPrice: number;
  onPaymentTypeChange: (type: 'full' | 'deposit') => void;
  selectedType: 'full' | 'deposit';
  fullTotal: number;
  depositTotal: number;
}

const PaymentTypeSelector: React.FC<PaymentTypeSelectorProps> = ({
  paymentMode,
  guaranteePercentage,
  netPriceOwner,
  publicPrice,
  onPaymentTypeChange,
  selectedType,
  fullTotal,
  depositTotal
}) => {
  // Ne rien afficher si le mode est 'full' uniquement
  if (paymentMode === 'full') return null;

  // Si mode 'guarantee' uniquement, auto-sélectionner deposit et ne rien afficher
  // (le BookingSummary en dessous gère l'affichage)
  useEffect(() => {
    if (paymentMode === 'guarantee') {
      onPaymentTypeChange('deposit');
    }
  }, [paymentMode, onPaymentTypeChange]);

  if (paymentMode === 'guarantee') return null;

  // Mode 'both' : afficher les deux options en radio
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-gray-700">Choisissez votre mode de paiement :</p>

      {/* Option 1 : Paiement complet */}
      <Card
        className={`cursor-pointer transition-all ${
          selectedType === 'full'
            ? 'border-2 border-green-500 bg-green-50 shadow-sm'
            : 'border border-gray-200 hover:border-gray-300'
        }`}
        onClick={() => onPaymentTypeChange('full')}
      >
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
              selectedType === 'full' ? 'border-green-500' : 'border-gray-300'
            }`}>
              {selectedType === 'full' && <div className="w-2 h-2 rounded-full bg-green-500" />}
            </div>
            <CreditCard className={`w-5 h-5 ${selectedType === 'full' ? 'text-green-600' : 'text-gray-400'}`} />
            <div className="flex-1">
              <div className="font-medium text-sm">Paiement complet en ligne</div>
              <div className="text-xs text-gray-500">Tout régler maintenant</div>
            </div>
            <span className="font-bold text-sm">{fullTotal.toLocaleString()} XOF</span>
          </div>
        </CardContent>
      </Card>

      {/* Option 2 : Garantie Terrain Bloqué */}
      <Card
        className={`cursor-pointer transition-all ${
          selectedType === 'deposit'
            ? 'border-2 border-green-500 bg-green-50 shadow-sm'
            : 'border border-gray-200 hover:border-gray-300'
        }`}
        onClick={() => onPaymentTypeChange('deposit')}
      >
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
              selectedType === 'deposit' ? 'border-green-500' : 'border-gray-300'
            }`}>
              {selectedType === 'deposit' && <div className="w-2 h-2 rounded-full bg-green-500" />}
            </div>
            <Shield className={`w-5 h-5 ${selectedType === 'deposit' ? 'text-green-600' : 'text-gray-400'}`} />
            <div className="flex-1">
              <div className="font-medium text-sm">Garantie Terrain Bloqué</div>
              <div className="text-xs text-gray-500">
                Avance {Math.round(guaranteePercentage * 100)}% en ligne + solde cash sur place
              </div>
            </div>
            <span className="font-bold text-sm">{depositTotal.toLocaleString()} XOF</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentTypeSelector;
