
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { MapPin, CheckCircle, XCircle, RefreshCw } from 'lucide-react';

interface GeocodingStatsProps {
  stats: {
    total: number;
    withCoordinates: number;
    withoutCoordinates: number;
    recentlyUpdated: number;
  };
}

export const GeocodingStats: React.FC<GeocodingStatsProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <MapPin className="w-5 h-5 text-blue-500" />
            <div>
              <p className="text-sm text-gray-600">Total des terrains</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <div>
              <p className="text-sm text-gray-600">Avec coordonnées</p>
              <p className="text-2xl font-bold text-green-600">{stats.withCoordinates}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <XCircle className="w-5 h-5 text-red-500" />
            <div>
              <p className="text-sm text-gray-600">Sans coordonnées</p>
              <p className="text-2xl font-bold text-red-600">{stats.withoutCoordinates}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <RefreshCw className="w-5 h-5 text-purple-500" />
            <div>
              <p className="text-sm text-gray-600">Mis à jour (24h)</p>
              <p className="text-2xl font-bold text-purple-600">{stats.recentlyUpdated}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
