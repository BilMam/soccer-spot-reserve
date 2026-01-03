import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Message, Conversation } from '@/types/chat';
import { useToast } from '@/hooks/use-toast';

export function useChat(conversationId: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Récupérer la conversation
  const { data: conversation, isLoading: conversationLoading } = useQuery({
    queryKey: ['conversation', conversationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          *,
          fields:field_id (id, name, images),
          bookings:booking_id (id, booking_date, start_time, end_time)
        `)
        .eq('id', conversationId)
        .single();

      if (error) throw error;
      return data as Conversation;
    },
    enabled: !!conversationId && !!user,
  });

  // Récupérer les messages
  const { data: messages = [], isLoading: messagesLoading } = useQuery({
    queryKey: ['messages', conversationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:sender_id (id, full_name, avatar_url)
        `)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as Message[];
    },
    enabled: !!conversationId && !!user,
  });

  // Subscription Realtime pour nouveaux messages
  useEffect(() => {
    if (!conversationId || !user) return;

    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          // Ajouter le nouveau message au cache
          queryClient.setQueryData(
            ['messages', conversationId],
            (oldMessages: Message[] = []) => {
              // Éviter les doublons
              if (oldMessages.some((m) => m.id === payload.new.id)) {
                return oldMessages;
              }
              return [...oldMessages, payload.new as Message];
            }
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, user, queryClient]);

  // Mutation pour envoyer un message
  const sendMessageMutation = useMutation({
    mutationFn: async (body: string): Promise<void> => {
      if (!user) throw new Error('Non authentifié');
      if (!body.trim()) throw new Error('Message vide');

      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          body: body.trim(),
        })
        .select(`
          *,
          sender:sender_id (id, full_name, avatar_url)
        `)
        .single();

      if (error) throw error;
      
      const newMessage = data as Message;
      
      // Ajouter au cache immédiatement
      queryClient.setQueryData(
        ['messages', conversationId],
        (oldMessages: Message[] = []) => {
          if (oldMessages.some((m) => m.id === newMessage.id)) {
            return oldMessages;
          }
          return [...oldMessages, newMessage];
        }
      );
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: "Impossible d'envoyer le message",
        variant: 'destructive',
      });
      console.error('Erreur envoi message:', error);
    },
  });

  // Marquer les notifications comme lues
  const markAsRead = async () => {
    if (!user || !conversationId) return;

    await supabase
      .from('chat_notifications')
      .update({ is_read: true })
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id)
      .eq('is_read', false);

    // Invalider le cache des conversations pour mettre à jour le badge
    queryClient.invalidateQueries({ queryKey: ['conversations'] });
    queryClient.invalidateQueries({ queryKey: ['unread-chat-count'] });
  };

  return {
    conversation,
    messages,
    isLoading: conversationLoading || messagesLoading,
    sendMessage: (body: string) => sendMessageMutation.mutateAsync(body),
    isSending: sendMessageMutation.isPending,
    markAsRead,
  };
}
