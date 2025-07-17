
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useNotificationPreferences } from '@/hooks/useNotificationPreferences';

export const usePendingReviews = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { preferences, sendSMSNotification } = useNotificationPreferences();

  // Récupérer les réservations en attente d'avis
  const { data: pendingReviews = [], refetch } = useQuery({
    queryKey: ['pending-reviews', user?.id],
    queryFn: async () => {
      if (!user) return [];

      // Récupérer toutes les réservations terminées
      const { data: completedBookings, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          *,
          fields (id, name, location, address)
        `)
        .eq('user_id', user.id)
        .eq('status', 'completed');

      if (bookingsError) throw bookingsError;

      if (!completedBookings || completedBookings.length === 0) return [];

      // Récupérer les avis existants pour ces réservations
      const { data: existingReviews, error: reviewsError } = await supabase
        .from('reviews')
        .select('booking_id')
        .eq('user_id', user.id)
        .in('booking_id', completedBookings.map(b => b.id));

      if (reviewsError) throw reviewsError;

      // Filtrer les réservations qui n'ont pas encore d'avis
      const reviewedBookingIds = new Set(existingReviews?.map(r => r.booking_id) || []);
      const pendingReviewBookings = completedBookings.filter(
        booking => !reviewedBookingIds.has(booking.id)
      );

      return pendingReviewBookings;
    },
    enabled: !!user,
    staleTime: 0, // Toujours considérer les données comme périmées
    refetchOnWindowFocus: true, // Re-fetch quand la fenêtre redevient active
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
        .select(`
          *,
          fields (id, name, location, address)
        `);

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
            const message = `Votre réservation chez ${booking.fields?.name || 'terrain'} est terminée ! Laissez un avis pour aider la communauté. 🌟`;
            
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

  // Fonction pour forcer le re-fetch des avis en attente
  const refreshPendingReviews = () => {
    refetch();
  };

  return {
    pendingReviews,
    pendingCount: pendingReviews.length,
    checkCompletedBookings,
    sendReviewReminder,
    refreshPendingReviews
  };
};
