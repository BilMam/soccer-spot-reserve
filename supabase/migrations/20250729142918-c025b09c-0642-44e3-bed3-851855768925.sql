-- Ajouter une politique RLS pour permettre aux admins de voir tous les terrains
CREATE POLICY "Admins can view all fields" ON public.fields
  FOR SELECT 
  USING (
    has_role(auth.uid(), 'super_admin'::user_role_type) OR 
    has_role(auth.uid(), 'admin_general'::user_role_type) OR 
    has_role(auth.uid(), 'admin_fields'::user_role_type)
  );