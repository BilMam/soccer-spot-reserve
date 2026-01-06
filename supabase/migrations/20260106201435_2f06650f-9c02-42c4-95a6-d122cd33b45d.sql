-- Permet au créateur de voir sa conversation (utile pour INSERT ... RETURNING / .select())
CREATE POLICY "Creator can view conversations"
ON public.conversations
FOR SELECT
USING (created_by_user_id = auth.uid());