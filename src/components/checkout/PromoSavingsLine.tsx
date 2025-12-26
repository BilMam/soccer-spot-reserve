import React from 'react';
import { PartyPopper } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PromoSavingsLineProps {
  savings: number;
  promoCode?: string | null;
  promoName?: string;
  className?: string;
}

/**
 * Ligne affichée après paiement si une promo a été utilisée
 */
const PromoSavingsLine: React.FC<PromoSavingsLineProps> = ({
  savings,
  promoCode,
  promoName,
  className
}) => {
  if (savings <= 0) return null;

  return (
    <div
      className={cn(
        'flex items-center gap-2 px-4 py-3 rounded-lg',
        'bg-green-50 border border-green-200 text-green-700',
        className
      )}
    >
      <PartyPopper className="w-5 h-5 text-green-600 flex-shrink-0" />
      <div className="flex flex-col">
        <span className="font-medium">
          Vous avez économisé {savings.toLocaleString()} XOF
        </span>
        {(promoCode || promoName) && (
          <span className="text-sm text-green-600">
            {promoCode ? `avec le code ${promoCode}` : promoName ? `grâce à ${promoName}` : ''}
          </span>
        )}
      </div>
    </div>
  );
};

export default PromoSavingsLine;
