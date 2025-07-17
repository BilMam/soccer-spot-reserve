
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { geocodeExistingFields } from '@/utils/geocodingUtils';
import { GeocodingStats } from './geocoding/GeocodingStats';
import { GeocodingProgress } from './geocoding/GeocodingProgress';
import { GeocodingActions } from './geocoding/GeocodingActions';
import { GeocodingResults } from './geocoding/GeocodingResults';

interface GeocodingStatsType {
  total: number;
  withCoordinates: number;
  withoutCoordinates: number;
  recentlyUpdated: number;
}

const GeocodingDashboard: React.FC = () => {
  const [stats, setStats] = useState<GeocodingStatsType>({
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

  return (
    <div className="space-y-6">
      <GeocodingStats stats={stats} />
      <GeocodingProgress stats={stats} />
      <GeocodingActions
        stats={stats}
        isGeocoding={isGeocoding}
        geocodingProgress={geocodingProgress}
        onBulkGeocode={handleBulkGeocode}
        onRefreshStats={fetchStats}
      />
      {geocodingResults && (
        <GeocodingResults
          results={geocodingResults}
          onReset={resetGeocodingResults}
        />
      )}
    </div>
  );
};

export default GeocodingDashboard;
