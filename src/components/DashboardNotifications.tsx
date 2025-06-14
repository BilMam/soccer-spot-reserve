
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Bell, AlertCircle, CheckCircle, Info, X } from 'lucide-react';

interface NotificationsProps {
  ownerId: string;
}

const DashboardNotifications = ({ ownerId }: NotificationsProps) => {
  const { data: pendingBookings } = useQuery({
    queryKey: ['pending-notifications', ownerId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_owner_recent_bookings', {
        owner_uuid: ownerId
      });

      if (error) throw error;
      return data?.filter(booking => booking.status === 'pending') || [];
    },
    enabled: !!ownerId
  });

  const { data: inactiveFields } = useQuery({
    queryKey: ['inactive-fields', ownerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fields')
        .select('id, name')
        .eq('owner_id', ownerId)
        .eq('is_active', false);

      if (error) throw error;
      return data || [];
    },
    enabled: !!ownerId
  });

  const notifications = [
    ...(pendingBookings?.map(booking => ({
      id: `booking-${booking.booking_id}`,
      type: 'pending',
      title: 'Nouvelle réservation en attente',
      message: `${booking.user_name} souhaite réserver ${booking.field_name}`,
      icon: AlertCircle,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50 border-yellow-200'
    })) || []),
    ...(inactiveFields?.map(field => ({
      id: `field-${field.id}`,
      type: 'inactive',
      title: 'Terrain inactif',
      message: `${field.name} n'est pas disponible à la réservation`,
      icon: Info,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 border-blue-200'
    })) || [])
  ];

  if (notifications.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Bell className="w-5 h-5" />
            <span>Notifications</span>
            <Badge variant="secondary" className="ml-auto">0</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-gray-500">
            <CheckCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>Aucune notification</p>
            <p className="text-sm">Tout est à jour !</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Bell className="w-5 h-5" />
          <span>Notifications</span>
          <Badge variant="destructive" className="ml-auto">{notifications.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {notifications.slice(0, 3).map((notification) => (
            <div
              key={notification.id}
              className={`p-3 rounded-lg border ${notification.bgColor}`}
            >
              <div className="flex items-start space-x-3">
                <notification.icon className={`w-5 h-5 mt-0.5 ${notification.color}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">
                    {notification.title}
                  </p>
                  <p className="text-sm text-gray-600">
                    {notification.message}
                  </p>
                </div>
                <Button variant="ghost" size="sm" className="flex-shrink-0">
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
          
          {notifications.length > 3 && (
            <div className="text-center pt-2">
              <Button variant="outline" size="sm">
                Voir toutes les notifications ({notifications.length})
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default DashboardNotifications;
