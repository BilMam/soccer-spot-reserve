
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import AllBookingsSection from './AllBookingsSection';

interface OwnerBookingsProps {
  ownerId: string;
}

const OwnerBookings: React.FC<OwnerBookingsProps> = ({ ownerId }) => {
  const { data: bookings, isLoading, refetch } = useQuery({
    queryKey: ['owner-bookings', ownerId],
    queryFn: async () => {
      console.log('🔍 Récupération des réservations pour le propriétaire:', ownerId);
      
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          profiles!bookings_user_id_fkey(full_name, email),
          fields!bookings_field_id_fkey(name, location, owner_id)
        `)
        .eq('fields.owner_id', ownerId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Erreur lors de la récupération des réservations:', error);
        throw error;
      }
      
      console.log('📋 Réservations récupérées:', data);
      return data;
    },
    enabled: !!ownerId
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                <div className="h-6 bg-gray-200 rounded w-2/3"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AllBookingsSection bookings={bookings || []} />
    </div>
  );
};

export default OwnerBookings;
