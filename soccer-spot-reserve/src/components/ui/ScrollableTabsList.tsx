import React, { useRef, useState, useEffect, useCallback } from 'react';
import { TabsList } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

interface ScrollableTabsListProps {
  children: React.ReactNode;
  className?: string;
}

const ScrollableTabsList: React.FC<ScrollableTabsListProps> = ({ children, className }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(false);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setShowLeft(el.scrollLeft > 2);
    setShowRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 2);
  }, []);

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [checkScroll]);

  return (
    <div className="relative">
      <TabsList
        ref={scrollRef as any}
        onScroll={checkScroll}
        className={cn("flex w-full overflow-x-auto no-scrollbar", className)}
      >
        {children}
      </TabsList>
      {showLeft && (
        <div className="absolute left-0 top-0 bottom-0 w-10 pointer-events-none z-10 bg-gradient-to-r from-muted to-transparent rounded-l-md" />
      )}
      {showRight && (
        <div className="absolute right-0 top-0 bottom-0 w-10 pointer-events-none z-10 bg-gradient-to-l from-muted to-transparent rounded-r-md" />
      )}
    </div>
  );
};

export default ScrollableTabsList;
