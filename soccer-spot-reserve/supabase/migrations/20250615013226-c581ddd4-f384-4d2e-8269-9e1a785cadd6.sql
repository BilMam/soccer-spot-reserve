
-- Mettre à jour la fonction approve_owner_application pour inclure les super_admin
CREATE OR REPLACE FUNCTION public.approve_owner_application(application_id uuid, notes text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- Vérifier que l'utilisateur est admin (inclure super_admin)
  IF NOT (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin_general') OR has_role(auth.uid(), 'admin_fields')) THEN
    RAISE EXCEPTION 'Access denied: admin privileges required';
  END IF;

  -- Mettre à jour la demande
  UPDATE public.owner_applications 
  SET 
    status = 'approved',
    admin_notes = COALESCE(notes, admin_notes),
    reviewed_by = auth.uid(),
    reviewed_at = now(),
    updated_at = now()
  WHERE id = application_id;

  -- Mettre à jour le type d'utilisateur dans profiles
  UPDATE public.profiles 
  SET user_type = 'owner'
  WHERE id = (SELECT user_id FROM public.owner_applications WHERE id = application_id);
END;
$function$;

-- Mettre à jour la fonction reject_owner_application pour inclure les super_admin
CREATE OR REPLACE FUNCTION public.reject_owner_application(application_id uuid, notes text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- Vérifier que l'utilisateur est admin (inclure super_admin)
  IF NOT (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin_general') OR has_role(auth.uid(), 'admin_fields')) THEN
    RAISE EXCEPTION 'Access denied: admin privileges required';
  END IF;

  -- Mettre à jour la demande
  UPDATE public.owner_applications 
  SET 
    status = 'rejected',
    admin_notes = notes,
    reviewed_by = auth.uid(),
    reviewed_at = now(),
    updated_at = now()
  WHERE id = application_id;
END;
$function$;
