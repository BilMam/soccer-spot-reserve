
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface GeocodingProgressProps {
  stats: {
    total: number;
    withCoordinates: number;
  };
}

export const GeocodingProgress: React.FC<GeocodingProgressProps> = ({ stats }) => {
  const completionRate = stats.total > 0 ? (stats.withCoordinates / stats.total) * 100 : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Progression du géocodage</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex justify-between text-sm">
            <span>Terrains géocodés</span>
            <span>{completionRate.toFixed(1)}%</span>
          </div>
          <Progress value={completionRate} className="h-2" />
          <p className="text-sm text-gray-600">
            {stats.withCoordinates} sur {stats.total} terrains ont des coordonnées GPS
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
