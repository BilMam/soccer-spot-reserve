// Types pour le système de chat post-réservation

export interface Conversation {
  id: string;
  field_id: string;
  booking_id: string;
  created_by_user_id: string;
  status: 'open' | 'closed';
  created_at: string;
  updated_at: string;
  // Relations jointes
  fields?: {
    id: string;
    name: string;
    images?: string[];
  };
  bookings?: {
    id: string;
    booking_date: string;
    start_time: string;
    end_time: string;
  };
}

export interface ConversationWithDetails extends Conversation {
  last_message?: Message;
  unread_count: number;
  other_participant?: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
}

export interface ConversationParticipant {
  conversation_id: string;
  user_id: string;
  role: 'user' | 'owner' | 'agent';
  joined_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  // Relation jointe
  sender?: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
}

export interface ChatNotification {
  id: string;
  user_id: string;
  conversation_id: string;
  message_id?: string;
  title?: string;
  body?: string;
  link?: string;
  is_read: boolean;
  created_at: string;
}

export interface CreateConversationParams {
  fieldId: string;
  bookingId: string;
  ownerId: string;
}
