
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, User, MapPin, Star } from 'lucide-react';

interface ActivityProps {
  ownerId: string;
}

const RecentActivity = ({ ownerId }: ActivityProps) => {
  const { data: recentBookings, isLoading } = useQuery({
    queryKey: ['recent-activity', ownerId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_owner_recent_bookings', {
        owner_uuid: ownerId
      });

      if (error) throw error;
      return data?.slice(0, 5) || []; // Limiter à 5 activités récentes
    },
    enabled: !!ownerId
  });

  const getActivityIcon = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <User className="w-4 h-4 text-green-600" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      default:
        return <MapPin className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Activité récente</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center space-x-4">
                <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Clock className="w-5 h-5" />
          <span>Activité récente</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!recentBookings || recentBookings.length === 0 ? (
          <div className="text-center py-6 text-gray-500">
            <Clock className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>Aucune activité récente</p>
          </div>
        ) : (
          <div className="space-y-4">
            {recentBookings.map((booking) => (
              <div key={booking.booking_id} className="flex items-start space-x-3 p-3 rounded-lg bg-gray-50">
                <div className="flex-shrink-0 mt-1">
                  {getActivityIcon(booking.status)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {booking.user_name || 'Client anonyme'}
                    </p>
                    <Badge className={`text-xs ${getStatusColor(booking.status)}`}>
                      {booking.status === 'confirmed' ? 'Confirmée' : 
                       booking.status === 'pending' ? 'En attente' : 
                       'Annulée'}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 mb-1">
                    {booking.field_name}
                  </p>
                  <div className="flex items-center text-xs text-gray-500 space-x-4">
                    <span>{new Date(booking.booking_date).toLocaleDateString('fr-FR')}</span>
                    <span>{booking.start_time} - {booking.end_time}</span>
                    <span className="font-medium">{booking.total_price}€</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RecentActivity;
