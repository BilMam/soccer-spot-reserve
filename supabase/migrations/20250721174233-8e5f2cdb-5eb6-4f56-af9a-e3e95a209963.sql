-- Corriger la fonction approve_owner_application pour ajouter le rôle owner
CREATE OR REPLACE FUNCTION public.approve_owner_application(application_id uuid, notes text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  app_user_id uuid;
BEGIN
  -- Vérifier que l'utilisateur est admin (inclure super_admin)
  IF NOT (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin_general') OR has_role(auth.uid(), 'admin_fields')) THEN
    RAISE EXCEPTION 'Access denied: admin privileges required';
  END IF;

  -- Récupérer l'ID utilisateur de l'application
  SELECT user_id INTO app_user_id 
  FROM public.owner_applications 
  WHERE id = application_id;

  IF app_user_id IS NULL THEN
    RAISE EXCEPTION 'Application not found';
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
  WHERE id = app_user_id;
  
  -- Ajouter le rôle owner dans user_roles
  INSERT INTO public.user_roles (user_id, role, granted_by, notes)
  VALUES (app_user_id, 'owner', auth.uid(), 'Approved owner application')
  ON CONFLICT (user_id, role) 
  DO UPDATE SET 
    granted_by = auth.uid(), 
    granted_at = now(), 
    is_active = true,
    notes = 'Approved owner application';
END;
$function$