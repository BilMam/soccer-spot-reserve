import React from 'react';
import { Tag } from 'lucide-react';
import { ActivePromo } from '@/hooks/useActivePromosForField';
import { cn } from '@/lib/utils';

interface PromoInfoChipProps {
  promos: ActivePromo[];
  className?: string;
}

/**
 * Chip discret affiché près du pricing sur la page détail terrain
 */
const PromoInfoChip: React.FC<PromoInfoChipProps> = ({ promos, className }) => {
  if (!promos || promos.length === 0) return null;

  // Trouver la meilleure promo pour l'affichage
  const bestPromo = promos.reduce((best, current) => {
    if (!best) return current;
    return current.discountValue > best.discountValue ? current : best;
  }, promos[0]);

  // Générer le message
  const getMessage = () => {
    const discountLabel = bestPromo.discountType === 'percent'
      ? `-${bestPromo.discountValue}%`
      : `-${bestPromo.discountValue.toLocaleString()} F`;

    // Si la promo a des créneaux ciblés, les afficher
    if (bestPromo.timeSlots && bestPromo.timeSlots.length > 0) {
      const daysMap: Record<number, string> = {
        0: 'dim.',
        1: 'lun.',
        2: 'mar.',
        3: 'mer.',
        4: 'jeu.',
        5: 'ven.',
        6: 'sam.'
      };

      // Grouper par jour
      const days = [...new Set(bestPromo.timeSlots.map(ts => ts.dayOfWeek))];
      
      if (days.length === 1 && days[0] !== null) {
        const dayName = daysMap[days[0]];
        const slot = bestPromo.timeSlots[0];
        const timeRange = `${slot.startTime.slice(0, 5)}–${slot.endTime.slice(0, 5)}`;
        return `${discountLabel} ${dayName} ${timeRange}`;
      } else if (days.length > 1) {
        const dayNames = days
          .filter(d => d !== null)
          .map(d => daysMap[d!])
          .join(', ');
        return `${discountLabel} ${dayNames}`;
      }
    }

    // Promo générale
    if (promos.length > 1) {
      return 'Promos possibles sur certains créneaux';
    }
    return `${discountLabel} sur certains créneaux`;
  };

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full',
        'bg-orange-50 text-orange-700 border border-orange-200',
        'text-sm font-medium',
        className
      )}
    >
      <Tag className="w-3.5 h-3.5" />
      <span>{getMessage()}</span>
    </div>
  );
};

export default PromoInfoChip;
