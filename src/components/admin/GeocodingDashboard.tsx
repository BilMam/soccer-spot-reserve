
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { MapPin, CheckCircle, XCircle, RefreshCw, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { geocodeExistingFields } from '@/utils/geocodingUtils';

interface GeocodingStats {
  total: number;
  withCoordinates: number;
  withoutCoordinates: number;
  recentlyUpdated: number;
}

const GeocodingDashboard: React.FC = () => {
  const [stats, setStats] = useState<GeocodingStats>({
    total: 0,
    withCoordinates: 0,
    withoutCoordinates: 0,
    recentlyUpdated: 0
  });
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [geocodingProgress, setGeocodingProgress] = useState(0);
  const [geocodingResults, setGeocodingResults] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // Récupérer les statistiques des terrains
      const { data: allFields, error } = await supabase
        .from('fields')
        .select('id, latitude, longitude, updated_at');

      if (error) throw error;

      const total = allFields?.length || 0;
      const withCoordinates = allFields?.filter(f => f.latitude && f.longitude).length || 0;
      const withoutCoordinates = total - withCoordinates;
      
      // Terrains mis à jour dans les dernières 24h
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const recentlyUpdated = allFields?.filter(f => f.updated_at > oneDayAgo).length || 0;

      setStats({
        total,
        withCoordinates,
        withoutCoordinates,
        recentlyUpdated
      });
    } catch (error) {
      console.error('Erreur lors du chargement des statistiques:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les statistiques",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBulkGeocode = async () => {
    setIsGeocoding(true);
    setGeocodingProgress(0);
    setGeocodingResults(null);

    try {
      toast({
        title: "Géocodage en cours",
        description: "Le géocodage de tous les terrains a commencé..."
      });

      const results = await geocodeExistingFields();
      
      setGeocodingResults(results);
      setGeocodingProgress(100);

      if (results.success > 0) {
        toast({
          title: "Géocodage terminé",
          description: `${results.success} terrain(s) géocodé(s) avec succès sur ${results.total}`
        });
        
        // Rafraîchir les statistiques
        await fetchStats();
      } else {
        toast({
          title: "Aucun terrain géocodé",
          description: "Tous les terrains ont déjà des coordonnées ou ont échoué",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Erreur lors du géocodage en masse:', error);
      toast({
        title: "Erreur",
        description: "Erreur lors du géocodage en masse",
        variant: "destructive"
      });
    } finally {
      setIsGeocoding(false);
    }
  };

  const resetGeocodingResults = () => {
    setGeocodingResults(null);
    setGeocodingProgress(0);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="w-4 h-4 animate-spin mr-2" />
            Chargement...
          </div>
        </CardContent>
      </Card>
    );
  }

  const completionRate = stats.total > 0 ? (stats.withCoordinates / stats.total) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Statistiques générales */}
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
                <p className="text-sm text-gray-600">Avec coordionnées</p>
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

      {/* Progression globale */}
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

      {/* Actions de géocodage */}
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
              onClick={handleBulkGeocode}
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
              onClick={fetchStats}
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

      {/* Résultats du géocodage */}
      {geocodingResults && (
        <Card>
          <CardHeader>
            <CardTitle className="flex justify-between items-center">
              <span>Résultats du géocodage</span>
              <Button onClick={resetGeocodingResults} size="sm" variant="outline">
                <X className="w-4 h-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{geocodingResults.success}</p>
                <p className="text-sm text-gray-600">Réussis</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-red-600">{geocodingResults.failed}</p>
                <p className="text-sm text-gray-600">Échecs</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">{geocodingResults.total}</p>
                <p className="text-sm text-gray-600">Total traités</p>
              </div>
            </div>

            {geocodingResults.errors.length > 0 && (
              <div>
                <h4 className="font-medium text-red-600 mb-2">Erreurs rencontrées:</h4>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {geocodingResults.errors.map((error: string, i: number) => (
                    <p key={i} className="text-sm text-red-600">• {error}</p>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default GeocodingDashboard;
