-- Create function to deactivate fields (for admins)
CREATE OR REPLACE FUNCTION public.deactivate_field(field_id uuid, reason text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Vérifier que l'utilisateur a les permissions d'admin
  IF NOT (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin_general') OR has_role(auth.uid(), 'admin_fields')) THEN
    RAISE EXCEPTION 'Access denied: admin privileges required';
  END IF;

  -- Vérifier que le terrain existe
  IF NOT EXISTS (SELECT 1 FROM public.fields WHERE id = field_id) THEN
    RAISE EXCEPTION 'Field not found';
  END IF;

  -- Marquer le terrain comme inactif (désactivé)
  UPDATE public.fields 
  SET 
    is_active = false,
    updated_at = now()
  WHERE id = field_id;
END;
$$;