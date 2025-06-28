
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface NotificationPreferences {
  id?: string;
  user_id: string;
  email_enabled: boolean;
  sms_enabled: boolean;
  push_enabled: boolean;
  review_reminders: boolean;
  booking_confirmations: boolean;
  marketing_notifications: boolean;
}

export const useNotificationPreferences = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: preferences, isLoading } = useQuery({
    queryKey: ['notification-preferences', user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from('user_notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data as NotificationPreferences;
    },
    enabled: !!user
  });

  const updatePreferences = useMutation({
    mutationFn: async (newPreferences: Partial<NotificationPreferences>) => {
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('user_notification_preferences')
        .upsert({
          user_id: user.id,
          ...newPreferences
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-preferences', user?.id] });
    }
  });

  const sendSMSNotification = useMutation({
    mutationFn: async ({ bookingId, messageType, phoneNumber, content }: {
      bookingId?: string;
      messageType: string;
      phoneNumber: string;
      content: string;
    }) => {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase.functions.invoke('send-sms-notification', {
        body: {
          userId: user.id,
          bookingId,
          messageType,
          phoneNumber,
          content
        }
      });

      if (error) throw error;
      return data;
    }
  });

  return {
    preferences,
    isLoading,
    updatePreferences,
    sendSMSNotification
  };
};
