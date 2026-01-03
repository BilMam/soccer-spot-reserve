-- =================================================
-- CHAT POST-RÉSERVATION PISPORT
-- Tables, triggers, RLS policies pour messagerie
-- =================================================

-- =================================================
-- TABLE: conversations
-- Une conversation par réservation confirmée
-- =================================================
CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  field_id UUID NOT NULL REFERENCES public.fields(id) ON DELETE CASCADE,
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  created_by_user_id UUID NOT NULL REFERENCES public.profiles(id),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index pour performances
CREATE INDEX idx_conversations_booking ON public.conversations(booking_id);
CREATE INDEX idx_conversations_creator ON public.conversations(created_by_user_id);
CREATE INDEX idx_conversations_field ON public.conversations(field_id);
CREATE INDEX idx_conversations_updated ON public.conversations(updated_at DESC);

-- Une seule conversation par réservation
CREATE UNIQUE INDEX idx_unique_booking_conversation ON public.conversations(booking_id);

-- =================================================
-- TABLE: conversation_participants
-- Participants à une conversation (user, owner, agent)
-- =================================================
CREATE TABLE public.conversation_participants (
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  role TEXT NOT NULL CHECK (role IN ('user', 'owner', 'agent')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (conversation_id, user_id)
);

CREATE INDEX idx_participants_user ON public.conversation_participants(user_id);
CREATE INDEX idx_participants_conversation ON public.conversation_participants(conversation_id);

-- =================================================
-- TABLE: messages
-- Messages dans une conversation
-- =================================================
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id),
  body TEXT NOT NULL CHECK (length(body) > 0 AND length(body) <= 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_messages_conversation ON public.messages(conversation_id, created_at DESC);
CREATE INDEX idx_messages_sender ON public.messages(sender_id);

-- =================================================
-- TABLE: chat_notifications
-- Notifications in-app pour les messages
-- =================================================
CREATE TABLE public.chat_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  message_id UUID REFERENCES public.messages(id) ON DELETE CASCADE,
  title TEXT,
  body TEXT,
  link TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_chat_notif_user ON public.chat_notifications(user_id, is_read, created_at DESC);
CREATE INDEX idx_chat_notif_conversation ON public.chat_notifications(conversation_id);

-- =================================================
-- TRIGGER: Mise à jour updated_at sur nouveau message
-- =================================================
CREATE OR REPLACE FUNCTION public.update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.conversations 
  SET updated_at = now() 
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_update_conversation_on_message
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.update_conversation_timestamp();

-- =================================================
-- TRIGGER: Notification automatique aux destinataires
-- =================================================
CREATE OR REPLACE FUNCTION public.notify_chat_recipients()
RETURNS TRIGGER AS $$
DECLARE
  participant RECORD;
  conv RECORD;
BEGIN
  -- Récupérer infos conversation et terrain
  SELECT c.*, f.name as field_name INTO conv
  FROM public.conversations c
  JOIN public.fields f ON c.field_id = f.id
  WHERE c.id = NEW.conversation_id;
  
  -- Notifier tous les participants sauf l'expéditeur
  FOR participant IN 
    SELECT user_id FROM public.conversation_participants 
    WHERE conversation_id = NEW.conversation_id 
    AND user_id != NEW.sender_id
  LOOP
    INSERT INTO public.chat_notifications (
      user_id, 
      conversation_id, 
      message_id,
      title, 
      body, 
      link
    ) VALUES (
      participant.user_id,
      NEW.conversation_id,
      NEW.id,
      'Nouveau message - ' || conv.field_name,
      substring(NEW.body from 1 for 100),
      '/conversation/' || NEW.conversation_id
    );
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_notify_chat_recipients
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.notify_chat_recipients();

-- =================================================
-- RLS POLICIES
-- =================================================

-- Activer RLS sur toutes les tables
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_notifications ENABLE ROW LEVEL SECURITY;

-- CONVERSATIONS

-- Participants peuvent voir leurs conversations
CREATE POLICY "Participants can view conversations"
ON public.conversations FOR SELECT
USING (
  id IN (
    SELECT conversation_id FROM public.conversation_participants
    WHERE user_id = auth.uid()
  )
);

-- Utilisateurs peuvent créer une conversation pour leur réservation confirmée
CREATE POLICY "Users can create conversations for their bookings"
ON public.conversations FOR INSERT
WITH CHECK (
  auth.uid() = created_by_user_id
  AND booking_id IN (
    SELECT id FROM public.bookings 
    WHERE user_id = auth.uid() 
    AND status IN ('confirmed', 'completed', 'owner_confirmed')
    AND payment_status = 'paid'
  )
);

-- Créateur peut mettre à jour le statut
CREATE POLICY "Creator can update conversation status"
ON public.conversations FOR UPDATE
USING (created_by_user_id = auth.uid());

-- CONVERSATION_PARTICIPANTS

-- Participants peuvent voir les autres participants
CREATE POLICY "Participants can view participants"
ON public.conversation_participants FOR SELECT
USING (
  conversation_id IN (
    SELECT conversation_id FROM public.conversation_participants
    WHERE user_id = auth.uid()
  )
);

-- Système peut ajouter des participants (via trigger ou fonction)
CREATE POLICY "System can add participants"
ON public.conversation_participants FOR INSERT
WITH CHECK (
  -- Le créateur de la conversation peut s'ajouter
  user_id = auth.uid()
  OR
  -- Ou c'est le propriétaire du terrain de la conversation
  EXISTS (
    SELECT 1 FROM public.conversations c
    JOIN public.fields f ON c.field_id = f.id
    WHERE c.id = conversation_id AND f.owner_id = user_id
  )
);

-- MESSAGES

-- Participants peuvent voir les messages
CREATE POLICY "Participants can view messages"
ON public.messages FOR SELECT
USING (
  conversation_id IN (
    SELECT conversation_id FROM public.conversation_participants
    WHERE user_id = auth.uid()
  )
);

-- Participants peuvent envoyer des messages
CREATE POLICY "Participants can send messages"
ON public.messages FOR INSERT
WITH CHECK (
  sender_id = auth.uid()
  AND conversation_id IN (
    SELECT conversation_id FROM public.conversation_participants
    WHERE user_id = auth.uid()
  )
);

-- CHAT_NOTIFICATIONS

-- Utilisateurs voient leurs propres notifications
CREATE POLICY "Users view own chat notifications"
ON public.chat_notifications FOR SELECT
USING (user_id = auth.uid());

-- Utilisateurs peuvent marquer leurs notifications comme lues
CREATE POLICY "Users can mark chat notifications read"
ON public.chat_notifications FOR UPDATE
USING (user_id = auth.uid());

-- Système peut créer des notifications (via trigger)
CREATE POLICY "System can create chat notifications"
ON public.chat_notifications FOR INSERT
WITH CHECK (true);

-- =================================================
-- REALTIME
-- =================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER TABLE public.messages REPLICA IDENTITY FULL;