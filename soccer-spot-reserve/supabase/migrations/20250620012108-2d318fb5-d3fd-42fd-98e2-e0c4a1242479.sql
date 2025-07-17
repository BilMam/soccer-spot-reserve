
-- Mettre à jour la fonction approve_field pour utiliser le nouveau système de rôles
CREATE OR REPLACE FUNCTION public.approve_field(field_id uuid, notes text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- Vérifier que l'utilisateur a les permissions d'admin avec le nouveau système de rôles
  IF NOT (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin_general') OR has_role(auth.uid(), 'admin_fields')) THEN
    RAISE EXCEPTION 'Access denied: admin privileges required';
  END IF;

  -- Marquer le terrain comme actif (approuvé)
  UPDATE public.fields 
  SET 
    is_active = true,
    updated_at = now()
  WHERE id = field_id;
END;
$function$;
