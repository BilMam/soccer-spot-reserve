import React from 'react';
import { cn } from '@/lib/utils';

interface LoadingStateProps {
  className?: string;
  text?: string;
  variant?: 'default' | 'card' | 'table';
}

export const LoadingState: React.FC<LoadingStateProps> = ({ 
  className, 
  text = 'Chargement...', 
  variant = 'default' 
}) => {
  if (variant === 'card') {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="space-y-3">
          <div className="h-4 bg-muted rounded animate-pulse" />
          <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
          <div className="h-4 bg-muted rounded animate-pulse w-1/2" />
        </div>
      </div>
    );
  }

  if (variant === 'table') {
    return (
      <div className={cn("space-y-3", className)}>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex space-x-4">
            <div className="h-4 bg-muted rounded animate-pulse flex-1" />
            <div className="h-4 bg-muted rounded animate-pulse w-24" />
            <div className="h-4 bg-muted rounded animate-pulse w-20" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={cn("flex items-center justify-center py-8", className)}>
      <div className="text-center space-y-3">
        <div className="inline-flex items-center space-x-2">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          <span className="text-muted-foreground">{text}</span>
        </div>
      </div>
    </div>
  );
};
