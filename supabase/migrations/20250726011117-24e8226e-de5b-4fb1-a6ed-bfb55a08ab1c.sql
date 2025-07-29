-- Ajouter les colonnes manquantes pour le workflow d'approbation
ALTER TABLE public.owners 
ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS approved_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS rejection_reason text;

-- Mettre à jour la fonction approve_owner_application pour créer l'enregistrement owner
CREATE OR REPLACE FUNCTION public.approve_owner_application(application_id uuid, notes text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  app_user_id uuid;
  app_phone text;
  app_full_name text;
BEGIN
  -- Vérifier que l'utilisateur est admin (inclure super_admin)
  IF NOT (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin_general') OR has_role(auth.uid(), 'admin_fields')) THEN
    RAISE EXCEPTION 'Access denied: admin privileges required';
  END IF;

  -- Récupérer les détails de l'application
  SELECT user_id, phone, full_name INTO app_user_id, app_phone, app_full_name
  FROM public.owner_applications 
  WHERE id = application_id AND status = 'pending';

  IF app_user_id IS NULL THEN
    RAISE EXCEPTION 'Application not found or already processed';
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

  -- Créer l'enregistrement owner avec status pending (sera approuvé par admin-approve-owner)
  INSERT INTO public.owners (user_id, phone, mobile_money, status, created_at, updated_at)
  VALUES (app_user_id, app_phone, app_phone, 'pending', now(), now())
  ON CONFLICT (user_id) DO UPDATE SET
    phone = EXCLUDED.phone,
    mobile_money = EXCLUDED.mobile_money,
    status = 'pending',
    updated_at = now();

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
$function$;