
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import Navbar from '@/components/Navbar';
import OwnerStats from '@/components/OwnerStats';
import OwnerBookings from '@/components/OwnerBookings';
import OwnerFields from '@/components/OwnerFields';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { PlusCircle, BarChart3, Calendar, MapPin } from 'lucide-react';

interface OwnerField {
  id: string;
  name: string;
  location: string;
  price_per_hour: number;
  is_active: boolean;
  rating: number;
  total_reviews: number;
}

const OwnerDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');

  const { data: fields, isLoading: fieldsLoading } = useQuery({
    queryKey: ['owner-fields', user?.id],
    queryFn: async () => {
      if (!user) throw new Error('User not authenticated');
      
      const { data, error } = await supabase
        .from('fields')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as OwnerField[];
    },
    enabled: !!user
  });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['owner-stats', user?.id],
    queryFn: async () => {
      if (!user) throw new Error('User not authenticated');
      
      const { data, error } = await supabase
        .from('owner_stats')
        .select('*')
        .eq('owner_id', user.id);

      if (error) throw error;
      return data;
    },
    enabled: !!user
  });

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container mx-auto px-4 py-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Accès non autorisé</h1>
          <p className="text-gray-600">Vous devez être connecté en tant que propriétaire pour accéder à cette page.</p>
        </div>
      </div>
    );
  }

  const totalFields = fields?.length || 0;
  const totalRevenue = stats?.reduce((sum, stat) => sum + Number(stat.total_revenue), 0) || 0;
  const totalBookings = stats?.reduce((sum, stat) => sum + stat.total_bookings, 0) || 0;
  const avgRating = stats?.length ? 
    stats.reduce((sum, stat) => sum + Number(stat.avg_rating), 0) / stats.length : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard Propriétaire</h1>
            <p className="text-gray-600 mt-1">Gérez vos terrains et suivez vos performances</p>
          </div>
          <Button 
            className="bg-green-600 hover:bg-green-700"
            onClick={() => navigate('/add-field')}
          >
            <PlusCircle className="w-4 h-4 mr-2" />
            Ajouter un terrain
          </Button>
        </div>

        {/* Vue d'ensemble des métriques */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Terrains actifs</CardTitle>
              <MapPin className="w-4 h-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalFields}</div>
              <p className="text-xs text-gray-600">
                {fields?.filter(f => f.is_active).length || 0} actifs
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Chiffre d'affaires</CardTitle>
              <BarChart3 className="w-4 h-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalRevenue.toFixed(0)}€</div>
              <p className="text-xs text-gray-600">Ce mois</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Réservations</CardTitle>
              <Calendar className="w-4 h-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalBookings}</div>
              <p className="text-xs text-gray-600">Total</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Note moyenne</CardTitle>
              <div className="text-yellow-500">★</div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{avgRating.toFixed(1)}</div>
              <p className="text-xs text-gray-600">Sur 5 étoiles</p>
            </CardContent>
          </Card>
        </div>

        {/* Onglets de navigation */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
            <TabsTrigger value="bookings">Réservations</TabsTrigger>
            <TabsTrigger value="fields">Mes terrains</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <OwnerStats stats={stats} isLoading={statsLoading} />
          </TabsContent>

          <TabsContent value="bookings" className="space-y-6">
            <OwnerBookings ownerId={user.id} />
          </TabsContent>

          <TabsContent value="fields" className="space-y-6">
            <OwnerFields fields={fields} isLoading={fieldsLoading} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default OwnerDashboard;
