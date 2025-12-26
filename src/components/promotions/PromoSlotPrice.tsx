import React from 'react';
import { cn } from '@/lib/utils';

interface PromoSlotPriceProps {
  originalPrice: number;
  discountedPrice: number;
  discountLabel: string;
  savings: number;
  showSavings?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

/**
 * Affichage inline du prix avec promo sur un créneau éligible
 * Prix original barré + nouveau prix en vert + badge réduction
 */
const PromoSlotPrice: React.FC<PromoSlotPriceProps> = ({
  originalPrice,
  discountedPrice,
  discountLabel,
  savings,
  showSavings = true,
  size = 'md',
  className
}) => {
  const isSmall = size === 'sm';

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <div className="flex items-center gap-2 flex-wrap">
        {/* Prix original barré */}
        <span className={cn(
          'line-through text-muted-foreground',
          isSmall ? 'text-xs' : 'text-sm'
        )}>
          {originalPrice.toLocaleString()} XOF
        </span>

        {/* Nouveau prix */}
        <span className={cn(
          'font-bold text-green-600',
          isSmall ? 'text-sm' : 'text-base'
        )}>
          {discountedPrice.toLocaleString()} XOF
        </span>

        {/* Badge réduction */}
        <span className={cn(
          'inline-flex items-center px-1.5 py-0.5 rounded text-white font-semibold',
          'bg-gradient-to-r from-orange-500 to-red-500',
          isSmall ? 'text-[10px]' : 'text-xs'
        )}>
          {discountLabel}
        </span>
      </div>

      {/* Économies (optionnel) */}
      {showSavings && savings > 0 && (
        <span className={cn(
          'text-orange-600',
          isSmall ? 'text-[10px]' : 'text-xs'
        )}>
          💰 Économie : {savings.toLocaleString()} F
        </span>
      )}
    </div>
  );
};

export default PromoSlotPrice;
