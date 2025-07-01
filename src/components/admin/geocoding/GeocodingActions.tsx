
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { MapPin, CheckCircle, RefreshCw, AlertTriangle } from 'lucide-react';

interface GeocodingActionsProps {
  stats: {
    withoutCoordinates: number;
  };
  isGeocoding: boolean;
  geocodingProgress: number;
  onBulkGeocode: () => void;
  onRefreshStats: () => void;
}

export const GeocodingActions: React.FC<GeocodingActionsProps> = ({
  stats,
  isGeocoding,
  geocodingProgress,
  onBulkGeocode,
  onRefreshStats
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Actions de géocodage</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {stats.withoutCoordinates > 0 ? (
          <Alert>
            <AlertTriangle className="w-4 h-4" />
            <AlertDescription>
              {stats.withoutCoordinates} terrain(s) n'ont pas de coordonnées GPS. 
              Le géocodage automatique va tenter de les localiser.
            </AlertDescription>
          </Alert>
        ) : (
          <Alert>
            <CheckCircle className="w-4 h-4" />
            <AlertDescription>
              Tous les terrains ont des coordonnées GPS ! 🎉
            </AlertDescription>
          </Alert>
        )}

        <div className="flex space-x-3">
          <Button
            onClick={onBulkGeocode}
            disabled={isGeocoding || stats.withoutCoordinates === 0}
            className="flex-1"
          >
            {isGeocoding ? (
              <RefreshCw className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <MapPin className="w-4 h-4 mr-2" />
            )}
            {isGeocoding ? 'Géocodage en cours...' : 'Géocoder tous les terrains'}
          </Button>

          <Button
            onClick={onRefreshStats}
            variant="outline"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualiser
          </Button>
        </div>

        {isGeocoding && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progression</span>
              <span>{geocodingProgress}%</span>
            </div>
            <Progress value={geocodingProgress} className="h-2" />
          </div>
        )}
      </CardContent>
    </Card>
  );
};
