
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface GeocodingResult {
  success: number;
  failed: number;
  total: number;
  errors: string[];
}

interface GeocodingResultsProps {
  results: GeocodingResult;
  onReset: () => void;
}

export const GeocodingResults: React.FC<GeocodingResultsProps> = ({ results, onReset }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>Résultats du géocodage</span>
          <Button onClick={onReset} size="sm" variant="outline">
            <X className="w-4 h-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">{results.success}</p>
            <p className="text-sm text-gray-600">Réussis</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-red-600">{results.failed}</p>
            <p className="text-sm text-gray-600">Échecs</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">{results.total}</p>
            <p className="text-sm text-gray-600">Total traités</p>
          </div>
        </div>

        {results.errors.length > 0 && (
          <div>
            <h4 className="font-medium text-red-600 mb-2">Erreurs rencontrées:</h4>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {results.errors.map((error: string, i: number) => (
                <p key={i} className="text-sm text-red-600">• {error}</p>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
