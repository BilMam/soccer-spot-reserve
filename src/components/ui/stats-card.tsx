import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatsCardProps {
  title: string;
  value: string | number;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
  icon: React.ComponentType<{ className?: string }>;
  iconColor?: string;
  iconBgColor?: string;
  className?: string;
}

export const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  change,
  trend = 'neutral',
  icon: Icon,
  iconColor = 'text-primary',
  iconBgColor = 'bg-primary/10',
  className
}) => {
  const getTrendIcon = () => {
    if (trend === 'up') return TrendingUp;
    if (trend === 'down') return TrendingDown;
    return null;
  };

  const getTrendColor = () => {
    if (trend === 'up') return 'text-green-600 bg-green-50';
    if (trend === 'down') return 'text-red-600 bg-red-50';
    return 'text-muted-foreground bg-muted';
  };

  const TrendIcon = getTrendIcon();

  return (
    <Card className={cn("soccer-card hover:shadow-lg transition-all duration-200", className)}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <div className="flex items-center space-x-2">
              <p className="text-2xl font-bold text-foreground">{value}</p>
              {change && (
                <Badge variant="secondary" className={cn("text-xs", getTrendColor())}>
                  {TrendIcon && <TrendIcon className="w-3 h-3 mr-1" />}
                  {change}
                </Badge>
              )}
            </div>
          </div>
          <div className={cn("flex items-center justify-center w-12 h-12 rounded-lg", iconBgColor)}>
            <Icon className={cn("w-6 h-6", iconColor)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
