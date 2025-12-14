-- Ajouter une politique permettant à tous les utilisateurs de voir les créneaux récurrents actifs
-- Cela permet au frontend de griser correctement les créneaux bloqués

CREATE POLICY "Anyone can view active recurring slots for booking"
ON public.recurring_slots
FOR SELECT
USING (is_active = true);