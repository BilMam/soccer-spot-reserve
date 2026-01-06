-- =================================================
-- FIX: Infinite recursion in conversation_participants RLS
-- =================================================

-- Supprimer les politiques problématiques
DROP POLICY IF EXISTS "Participants can view participants" ON public.conversation_participants;
DROP POLICY IF EXISTS "System can add participants" ON public.conversation_participants;
DROP POLICY IF EXISTS "Participants can view conversations" ON public.conversations;
DROP POLICY IF EXISTS "Participants can view messages" ON public.messages;
DROP POLICY IF EXISTS "Participants can send messages" ON public.messages;

-- =================================================
-- NOUVELLES POLITIQUES SANS RÉCURSION
-- =================================================

-- CONVERSATIONS: utiliser une jointure directe
CREATE POLICY "Participants can view conversations"
ON public.conversations FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    WHERE cp.conversation_id = id 
    AND cp.user_id = auth.uid()
  )
);

-- CONVERSATION_PARTICIPANTS: accès direct par user_id sans sous-requête
CREATE POLICY "Users can view their participations"
ON public.conversation_participants FOR SELECT
USING (user_id = auth.uid());

-- CONVERSATION_PARTICIPANTS: politique INSERT sans récursion
CREATE POLICY "Users can add participants to their conversations"
ON public.conversation_participants FOR INSERT
WITH CHECK (
  -- L'utilisateur peut s'ajouter lui-même
  (user_id = auth.uid())
  OR
  -- Ou ajouter le propriétaire du terrain (vérifié via conversations/fields)
  EXISTS (
    SELECT 1 FROM public.conversations c
    JOIN public.fields f ON c.field_id = f.id
    WHERE c.id = conversation_id 
    AND c.created_by_user_id = auth.uid()
    AND f.owner_id = user_id
  )
);

-- MESSAGES: jointure directe sans sous-requête récursive
CREATE POLICY "Participants can view messages"
ON public.messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    WHERE cp.conversation_id = messages.conversation_id
    AND cp.user_id = auth.uid()
  )
);

CREATE POLICY "Participants can send messages"
ON public.messages FOR INSERT
WITH CHECK (
  sender_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    WHERE cp.conversation_id = messages.conversation_id
    AND cp.user_id = auth.uid()
  )
);