
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import Navbar from '@/components/Navbar';
import DashboardMetrics from '@/components/DashboardMetrics';
import QuickActions from '@/components/QuickActions';
import RecentActivity from '@/components/RecentActivity';
import OwnerStats from '@/components/OwnerStats';
import OwnerBookings from '@/components/OwnerBookings';
import OwnerFields from '@/components/OwnerFields';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';

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
  const activeFields = fields?.filter(f => f.is_active).length || 0;
  const totalRevenue = stats?.reduce((sum, stat) => sum + Number(stat.total_revenue), 0) || 0;
  const totalBookings = stats?.reduce((sum, stat) => sum + stat.confirmed_bookings, 0) || 0;
  const pendingBookings = stats?.reduce((sum, stat) => sum + stat.pending_bookings, 0) || 0;
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

        {/* Métriques principales */}
        <div className="mb-8">
          <DashboardMetrics
            totalFields={totalFields}
            activeFields={activeFields}
            totalRevenue={totalRevenue}
            totalBookings={totalBookings}
            avgRating={avgRating}
            pendingBookings={pendingBookings}
          />
        </div>

        {/* Onglets de navigation */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
            <TabsTrigger value="bookings">Réservations</TabsTrigger>
            <TabsTrigger value="fields">Mes terrains</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <OwnerStats stats={stats} isLoading={statsLoading} />
              </div>
              <div className="space-y-6">
                <QuickActions />
                <RecentActivity ownerId={user.id} />
              </div>
            </div>
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
