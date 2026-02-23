import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Shield, CreditCard, Info } from 'lucide-react';
import { calculateGuaranteeBreakdown } from '@/utils/publicPricing';

interface PaymentTypeSelectorProps {
  paymentMode: 'full' | 'guarantee' | 'both';
  guaranteePercentage: number; // 0.10, 0.20, 0.30, 0.50
  netPriceOwner: number;
  publicPrice: number;
  onPaymentTypeChange: (type: 'full' | 'deposit') => void;
  selectedType: 'full' | 'deposit';
}

const PaymentTypeSelector: React.FC<PaymentTypeSelectorProps> = ({
  paymentMode,
  guaranteePercentage,
  netPriceOwner,
  publicPrice,
  onPaymentTypeChange,
  selectedType
}) => {
  // Ne rien afficher si le mode est 'full' uniquement
  if (paymentMode === 'full') return null;

  const guarantee = calculateGuaranteeBreakdown(netPriceOwner, guaranteePercentage);

  // Si mode 'guarantee' uniquement, afficher juste le détail
  if (paymentMode === 'guarantee') {
    return (
      <Card className="border-2 border-green-200 bg-green-50">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="w-5 h-5 text-green-600" />
            <span className="font-semibold text-green-800">Garantie Terrain Bloqué</span>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Avance en ligne :</span>
              <span className="font-medium">{guarantee.depositPublic.toLocaleString()} XOF</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Frais opérateurs (3%) :</span>
              <span className="text-gray-600">{guarantee.operatorFee.toLocaleString()} XOF</span>
            </div>
            <div className="flex justify-between border-t pt-2">
              <span className="text-gray-600">Total débité en ligne :</span>
              <span className="font-bold text-green-700">{guarantee.totalOnline.toLocaleString()} XOF</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Solde à régler sur place :</span>
              <span className="font-bold text-orange-600">{guarantee.balanceCash.toLocaleString()} XOF</span>
            </div>
          </div>
          <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700 flex items-start gap-1.5">
            <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span>Le solde de {guarantee.balanceCash.toLocaleString()} XOF est à régler directement au propriétaire sur place.</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Mode 'both' : afficher les deux options en radio
  const operatorFeeFull = Math.ceil(publicPrice * 0.03);
  const totalFull = publicPrice + operatorFeeFull;

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
            <span className="font-bold text-sm">{totalFull.toLocaleString()} XOF</span>
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
            <span className="font-bold text-sm">{guarantee.totalOnline.toLocaleString()} XOF</span>
          </div>

          {/* Détail visible quand sélectionné */}
          {selectedType === 'deposit' && (
            <div className="mt-3 ml-7 space-y-1.5 text-xs border-t pt-3">
              <div className="flex justify-between text-gray-600">
                <span>Avance en ligne :</span>
                <span>{guarantee.depositPublic.toLocaleString()} XOF</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Frais opérateurs (3%) :</span>
                <span>{guarantee.operatorFee.toLocaleString()} XOF</span>
              </div>
              <div className="flex justify-between font-medium text-green-700">
                <span>Total débité en ligne :</span>
                <span>{guarantee.totalOnline.toLocaleString()} XOF</span>
              </div>
              <div className="flex justify-between font-medium text-orange-600">
                <span>Solde à régler sur place (cash) :</span>
                <span>{guarantee.balanceCash.toLocaleString()} XOF</span>
              </div>
              <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-blue-700 flex items-start gap-1.5">
                <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span>Le solde de {guarantee.balanceCash.toLocaleString()} XOF est à régler directement au propriétaire sur place.</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentTypeSelector;
