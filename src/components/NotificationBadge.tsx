
import React from 'react';

interface NotificationBadgeProps {
  count: number;
  className?: string;
}

const NotificationBadge: React.FC<NotificationBadgeProps> = ({ count, className = '' }) => {
  if (count === 0) return null;

  return (
    <span className={`
      absolute -top-1 -right-1 
      bg-red-500 text-white 
      text-xs font-bold 
      rounded-full 
      min-w-[18px] h-[18px] 
      flex items-center justify-center 
      animate-pulse
      ${className}
    `}>
      {count > 99 ? '99+' : count}
    </span>
  );
};

export default NotificationBadge;
