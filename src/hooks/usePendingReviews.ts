
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export const usePendingReviews = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Récupérer les réservations en attente d'avis
  const { data: pendingReviews = [] } = useQuery({
    queryKey: ['pending-reviews', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          fields (name, location),
          reviews (id)
        `)
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .is('reviews.id', null);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user
  });

  // Mutation pour changer le statut des réservations terminées
  const updateCompletedBookings = useMutation({
    mutationFn: async () => {
      if (!user) return;

      const now = new Date();
      const currentDate = now.toISOString().split('T')[0];
      const currentTime = now.toTimeString().split(' ')[0];

      const { error } = await supabase
        .from('bookings')
        .update({ status: 'completed' })
        .eq('user_id', user.id)
        .in('status', ['confirmed', 'owner_confirmed'])
        .or(`booking_date.lt.${currentDate},and(booking_date.eq.${currentDate},end_time.lt.${currentTime})`);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-reviews', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['user-bookings', user?.id] });
    }
  });

  // Vérifier automatiquement les réservations terminées
  const checkCompletedBookings = () => {
    updateCompletedBookings.mutate();
  };

  return {
    pendingReviews,
    pendingCount: pendingReviews.length,
    checkCompletedBookings
  };
};
