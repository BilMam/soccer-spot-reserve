import React from 'react';
import { Zap, Ticket, Tag } from 'lucide-react';
import { formatXOF } from '@/utils/publicPricing';

interface PromoChipProps {
  discountType: 'percent' | 'fixed';
  discountValue: number;
  dayOfWeek?: number | null;
  startTime?: string;
  endTime?: string;
  isAutomatic?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

const dayNames = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];

const PromoChip: React.FC<PromoChipProps> = ({
  discountType,
  discountValue,
  dayOfWeek,
  startTime,
  endTime,
  isAutomatic = false,
  size = 'md',
  className = ''
}) => {
  const discountLabel = discountType === 'percent' 
    ? `-${discountValue}%` 
    : `-${formatXOF(discountValue)}`;

  const hasTimeSlot = dayOfWeek !== null && dayOfWeek !== undefined;
  const timeSlotLabel = hasTimeSlot 
    ? `${dayNames[dayOfWeek]} ${startTime?.slice(0, 5)}–${endTime?.slice(0, 5)}`
    : null;

  const sizeClasses = size === 'sm' 
    ? 'text-xs px-2 py-0.5 gap-1' 
    : 'text-sm px-2.5 py-1 gap-1.5';

  const Icon = isAutomatic ? Zap : Ticket;
  const bgColor = isAutomatic 
    ? 'bg-purple-50 border-purple-200 text-purple-700' 
    : 'bg-orange-50 border-orange-200 text-orange-700';

  return (
    <div 
      className={`inline-flex items-center rounded-full border ${bgColor} ${sizeClasses} ${className}`}
    >
      <Icon className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
      <span className="font-semibold">{discountLabel}</span>
      {timeSlotLabel && (
        <span className="opacity-75">{timeSlotLabel}</span>
      )}
      {!hasTimeSlot && (
        <span className="opacity-75">tous créneaux</span>
      )}
    </div>
  );
};

export default PromoChip;
