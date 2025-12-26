import React from 'react';
import { cn } from '@/lib/utils';

interface PromoBadgeProps {
  discountType: 'percent' | 'fixed';
  discountValue: number;
  endDate?: string | null;
  size?: 'sm' | 'md';
  className?: string;
}

/**
 * Badge discret affiché sur les cartes de terrain pour indiquer une promo active
 */
const PromoBadge: React.FC<PromoBadgeProps> = ({
  discountType,
  discountValue,
  endDate,
  size = 'sm',
  className
}) => {
  // Vérifier si la promo expire bientôt (dans 3 jours ou moins)
  const isExpiringSoon = endDate && (() => {
    const end = new Date(endDate);
    const now = new Date();
    const diffDays = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays <= 3 && diffDays >= 0;
  })();

  const discountLabel = discountType === 'percent' 
    ? `-${discountValue}%` 
    : `-${discountValue.toLocaleString()} F`;

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold rounded-full shadow-md',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm',
        'animate-pulse',
        className
      )}
    >
      <span>{discountLabel}</span>
      {isExpiringSoon && (
        <span className="text-[10px] opacity-90">• Bientôt</span>
      )}
    </div>
  );
};

export default PromoBadge;
