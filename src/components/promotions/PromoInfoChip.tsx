import React from 'react';
import { Tag } from 'lucide-react';
import { ActivePromo } from '@/hooks/useActivePromosForField';
import PromoChip from './PromoChip';

interface PromoInfoChipProps {
  promos: ActivePromo[];
  className?: string;
}

const PromoInfoChip: React.FC<PromoInfoChipProps> = ({ promos, className = '' }) => {
  if (!promos || promos.length === 0) return null;

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Tag className="w-4 h-4" />
        <span>Promotions disponibles ({promos.length})</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {promos.map((promo) => {
          // Si la promo a des créneaux ciblés, afficher un chip par créneau
          if (promo.timeSlots && promo.timeSlots.length > 0) {
            return promo.timeSlots.map((slot, slotIndex) => (
              <PromoChip
                key={`${promo.id}-${slotIndex}`}
                discountType={promo.discountType}
                discountValue={promo.discountValue}
                dayOfWeek={slot.dayOfWeek}
                startTime={slot.startTime}
                endTime={slot.endTime}
                isAutomatic={promo.isAutomatic}
                size="md"
              />
            ));
          }
          
          // Sinon, un seul chip "tous créneaux"
          return (
            <PromoChip
              key={promo.id}
              discountType={promo.discountType}
              discountValue={promo.discountValue}
              isAutomatic={promo.isAutomatic}
              size="md"
            />
          );
        })}
      </div>
    </div>
  );
};

export default PromoInfoChip;
