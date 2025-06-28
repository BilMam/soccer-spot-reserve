
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useNotificationPreferences } from '@/hooks/useNotificationPreferences';

export const usePendingReviews = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { preferences, sendSMSNotification } = useNotificationPreferences();

  // Récupérer les réservations en attente d'avis
  const { data: pendingReviews = [] } = useQuery({
    queryKey: ['pending-reviews', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          fields (id, name, location, address),
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

      const { data: updatedBookings, error } = await supabase
        .from('bookings')
        .update({ status: 'completed' })
        .eq('user_id', user.id)
        .in('status', ['confirmed', 'owner_confirmed'])
        .or(`booking_date.lt.${currentDate},and(booking_date.eq.${currentDate},end_time.lt.${currentTime})`)
        .select();

      if (error) throw error;

      // Envoyer des notifications SMS pour les nouvelles réservations terminées
      if (updatedBookings && updatedBookings.length > 0 && preferences?.sms_enabled && preferences?.review_reminders) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('phone')
          .eq('id', user.id)
          .single();

        if (profile?.phone) {
          for (const booking of updatedBookings) {
            const message = `Votre réservation chez ${booking.field_name || 'terrain'} est terminée ! Laissez un avis pour aider la communauté. 🌟`;
            
            try {
              await sendSMSNotification.mutateAsync({
                bookingId: booking.id,
                messageType: 'review_request',
                phoneNumber: profile.phone,
                content: message
              });
            } catch (error) {
              console.error('Erreur envoi SMS:', error);
            }
          }
        }
      }

      return updatedBookings;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-reviews', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['user-bookings', user?.id] });
    }
  });

  // Envoyer une notification SMS pour un rappel d'avis spécifique
  const sendReviewReminder = async (bookingId: string, fieldName: string) => {
    if (!user || !preferences?.sms_enabled || !preferences?.review_reminders) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('phone')
      .eq('id', user.id)
      .single();

    if (profile?.phone) {
      const message = `N'oubliez pas de laisser un avis pour votre réservation chez ${fieldName}. Votre opinion compte ! ⭐`;
      
      try {
        await sendSMSNotification.mutateAsync({
          bookingId,
          messageType: 'review_reminder',
          phoneNumber: profile.phone,
          content: message
        });
      } catch (error) {
        console.error('Erreur envoi rappel SMS:', error);
      }
    }
  };

  // Vérifier automatiquement les réservations terminées
  const checkCompletedBookings = () => {
    updateCompletedBookings.mutate();
  };

  return {
    pendingReviews,
    pendingCount: pendingReviews.length,
    checkCompletedBookings,
    sendReviewReminder
  };
};
