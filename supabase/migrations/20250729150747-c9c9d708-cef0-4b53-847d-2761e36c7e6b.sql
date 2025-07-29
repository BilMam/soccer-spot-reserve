-- Corriger la politique RLS pour l'insertion des demandes de propriétaires
DROP POLICY IF EXISTS "Users can create their own applications" ON public.owner_applications;

CREATE POLICY "Users can create their own applications" ON public.owner_applications
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);