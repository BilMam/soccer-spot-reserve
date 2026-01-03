import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { ConversationWithDetails } from '@/types/chat';

export function useConversations() {
  const { user } = useAuth();

  // Liste des conversations de l'utilisateur
  const { data: conversations = [], isLoading, refetch } = useQuery({
    queryKey: ['conversations', user?.id],
    queryFn: async () => {
      if (!user) return [];

      // Récupérer les conversations où l'utilisateur est participant
      const { data: participations, error: partError } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', user.id);

      if (partError) throw partError;
      if (!participations?.length) return [];

      const conversationIds = participations.map((p) => p.conversation_id);

      // Récupérer les détails des conversations
      const { data: convos, error: convError } = await supabase
        .from('conversations')
        .select(`
          *,
          fields:field_id (id, name, images),
          bookings:booking_id (id, booking_date, start_time, end_time)
        `)
        .in('id', conversationIds)
        .order('updated_at', { ascending: false });

      if (convError) throw convError;

      // Pour chaque conversation, récupérer le dernier message et le nombre non lu
      const conversationsWithDetails: ConversationWithDetails[] = await Promise.all(
        (convos || []).map(async (conv) => {
          // Dernier message
          const { data: lastMessages } = await supabase
            .from('messages')
            .select('*, sender:sender_id (id, full_name)')
            .eq('conversation_id', conv.id)
            .order('created_at', { ascending: false })
            .limit(1);

          // Compteur non lu
          const { count: unreadCount } = await supabase
            .from('chat_notifications')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', conv.id)
            .eq('user_id', user.id)
            .eq('is_read', false);

          // Autre participant (pour afficher le nom)
          const { data: participants } = await supabase
            .from('conversation_participants')
            .select('user_id, role')
            .eq('conversation_id', conv.id)
            .neq('user_id', user.id)
            .limit(1);

          let otherParticipant = undefined;
          if (participants?.[0]) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('id, full_name, avatar_url')
              .eq('id', participants[0].user_id)
              .single();
            otherParticipant = profile || undefined;
          }

          return {
            ...conv,
            last_message: lastMessages?.[0] || undefined,
            unread_count: unreadCount || 0,
            other_participant: otherParticipant,
          } as ConversationWithDetails;
        })
      );

      return conversationsWithDetails;
    },
    enabled: !!user,
  });

  // Compteur total de messages non lus
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['unread-chat-count', user?.id],
    queryFn: async () => {
      if (!user) return 0;

      const { count } = await supabase
        .from('chat_notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      return count || 0;
    },
    enabled: !!user,
    refetchInterval: 30000, // Rafraîchir toutes les 30 secondes
  });

  return {
    conversations,
    isLoading,
    unreadCount,
    refetch,
  };
}
