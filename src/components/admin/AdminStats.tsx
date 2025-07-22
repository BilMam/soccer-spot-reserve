
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, MapPin, Clock, CheckCircle } from 'lucide-react';

interface AdminStatsProps {
  hasAdminPermissions: boolean;
}

export const AdminStats: React.FC<AdminStatsProps> = ({ hasAdminPermissions }) => {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const [applicationsRes, fieldsRes, bookingsRes] = await Promise.all([
        supabase.from('owner_applications').select('id, status'),
        supabase.from('fields').select('id, is_active'),
        supabase.from('bookings').select('id, status')
      ]);

      const pendingApplications = applicationsRes.data?.filter(app => app.status === 'pending').length || 0;
      const totalFields = fieldsRes.data?.length || 0;
      const activeFields = fieldsRes.data?.filter(field => field.is_active).length || 0;
      const provisionalBookings = bookingsRes.data?.filter(booking => booking.status === 'provisional').length || 0;

      return {
        pendingApplications,
        totalFields,
        activeFields,
        provisionalBookings
      };
    },
    enabled: hasAdminPermissions
  });

  if (!hasAdminPermissions) return null;

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Demandes en attente</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats?.pendingApplications || 0}</div>
          <p className="text-xs text-muted-foreground">Applications propriétaires</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Terrains totaux</CardTitle>
          <MapPin className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats?.totalFields || 0}</div>
          <p className="text-xs text-muted-foreground">Tous les terrains</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Terrains actifs</CardTitle>
          <CheckCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats?.activeFields || 0}</div>
          <p className="text-xs text-muted-foreground">Terrains approuvés</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Paiements en cours</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats?.provisionalBookings || 0}</div>
          <p className="text-xs text-muted-foreground">Paiement en cours</p>
        </CardContent>
      </Card>
    </div>
  );
};
