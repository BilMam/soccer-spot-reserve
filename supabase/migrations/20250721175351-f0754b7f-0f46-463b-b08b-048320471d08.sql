
-- Migration: Unifier le système de permissions sur user_roles uniquement
-- Étape 1: S'assurer que l'enum user_role_type existe avec tous les rôles nécessaires

-- Vérifier et créer l'enum si nécessaire
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role_type') THEN
    CREATE TYPE public.user_role_type AS ENUM (
      'super_admin', 'admin_general', 'admin_fields',
      'admin_users', 'moderator', 'owner', 'player'
    );
  END IF;
END$$;

-- Étape 2: Migration des données user_type vers user_roles
-- Migrer les admins génériques
INSERT INTO public.user_roles (user_id, role, granted_by, notes)
SELECT 
  id, 
  'admin_general'::user_role_type,
  id, -- auto-accordé lors de la migration
  'Migrated from user_type during system unification'
FROM public.profiles
WHERE user_type = 'admin'
  AND id NOT IN (SELECT user_id FROM public.user_roles WHERE role = 'admin_general')
ON CONFLICT (user_id, role) DO NOTHING;

-- Migrer les propriétaires
INSERT INTO public.user_roles (user_id, role, granted_by, notes)
SELECT 
  id, 
  'owner'::user_role_type,
  id, -- auto-accordé lors de la migration
  'Migrated from user_type during system unification'
FROM public.profiles
WHERE user_type = 'owner'
  AND id NOT IN (SELECT user_id FROM public.user_roles WHERE role = 'owner')
ON CONFLICT (user_id, role) DO NOTHING;

-- Migrer les joueurs (par défaut pour tous les autres)
INSERT INTO public.user_roles (user_id, role, granted_by, notes)
SELECT 
  id, 
  'player'::user_role_type,
  id, -- auto-accordé lors de la migration
  'Migrated from user_type during system unification'
FROM public.profiles
WHERE (user_type IS NULL OR user_type = 'player' OR user_type NOT IN ('admin', 'owner'))
  AND id NOT IN (SELECT user_id FROM public.user_roles WHERE role = 'player')
ON CONFLICT (user_id, role) DO NOTHING;

-- Étape 3: Créer une fonction pour obtenir le rôle principal d'un utilisateur
CREATE OR REPLACE FUNCTION public.get_user_primary_role(p_user_id uuid)
RETURNS user_role_type
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = p_user_id 
    AND is_active = true 
    AND (expires_at IS NULL OR expires_at > now())
  ORDER BY
    CASE role
      WHEN 'super_admin' THEN 1
      WHEN 'admin_general' THEN 2
      WHEN 'admin_fields' THEN 3
      WHEN 'admin_users' THEN 4
      WHEN 'moderator' THEN 5
      WHEN 'owner' THEN 6
      WHEN 'player' THEN 7
    END
  LIMIT 1;
$$;

-- Étape 4: Créer une fonction pour vérifier plusieurs rôles à la fois
CREATE OR REPLACE FUNCTION public.has_any_role(p_user_id uuid, p_roles user_role_type[])
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = p_user_id 
      AND role = ANY(p_roles)
      AND is_active = true 
      AND (expires_at IS NULL OR expires_at > now())
  );
$$;

-- Étape 5: Mettre à jour la fonction approve_owner_application pour ne plus toucher user_type
CREATE OR REPLACE FUNCTION public.approve_owner_application(application_id uuid, notes text DEFAULT NULL::text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  app_user_id uuid;
BEGIN
  -- Vérifier que l'utilisateur est admin
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

  -- Ajouter UNIQUEMENT le rôle owner dans user_roles (ne plus toucher profiles.user_type)
  INSERT INTO public.user_roles (user_id, role, granted_by, notes)
  VALUES (app_user_id, 'owner', auth.uid(), COALESCE(notes, 'Approved owner application'))
  ON CONFLICT (user_id, role) 
  DO UPDATE SET 
    granted_by = auth.uid(), 
    granted_at = now(), 
    is_active = true,
    notes = COALESCE(notes, 'Approved owner application');
END;
$function$;

-- Étape 6: Mettre à jour change_user_type pour ne plus utiliser profiles.user_type
CREATE OR REPLACE FUNCTION public.change_user_type(target_user_id uuid, new_user_type text, new_role user_role_type DEFAULT NULL::user_role_type, reason text DEFAULT NULL::text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  current_primary_role user_role_type;
BEGIN
  -- Vérifier les permissions
  IF NOT (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin_general') OR has_role(auth.uid(), 'admin_users')) THEN
    RAISE EXCEPTION 'Permissions insuffisantes pour changer le type d''utilisateur';
  END IF;
  
  -- Empêcher l'auto-promotion vers super_admin (sauf si déjà super_admin)
  IF new_role = 'super_admin' AND auth.uid() = target_user_id AND NOT has_role(auth.uid(), 'super_admin') THEN
    RAISE EXCEPTION 'Auto-promotion vers super_admin interdite';
  END IF;
  
  -- Vérifier si on peut promouvoir vers ce rôle
  IF new_role IS NOT NULL AND NOT can_promote_user(auth.uid(), new_role) THEN
    RAISE EXCEPTION 'Permissions insuffisantes pour accorder ce rôle';
  END IF;
  
  -- Récupérer le rôle principal actuel
  SELECT get_user_primary_role(target_user_id) INTO current_primary_role;
  
  -- Ajouter le nouveau rôle si spécifié
  IF new_role IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role, granted_by, notes)
    VALUES (target_user_id, new_role, auth.uid(), reason)
    ON CONFLICT (user_id, role) 
    DO UPDATE SET 
      granted_by = auth.uid(), 
      granted_at = now(), 
      is_active = true,
      notes = reason;
  END IF;
  
  -- Enregistrer dans l'audit log
  INSERT INTO public.role_audit_log (
    action_type, target_user_id, performed_by, old_value, new_value, reason
  ) VALUES (
    'change_user_type', target_user_id, auth.uid(), 
    current_primary_role::text, 
    COALESCE(new_role::text, new_user_type), 
    reason
  );
END;
$function$;

-- Étape 7: Optionnel - Transformer user_type en colonne calculée (computed column)
-- Cette approche garde la compatibilité avec le code existant tout en centralisant sur user_roles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS user_type_computed text 
GENERATED ALWAYS AS (
  COALESCE(
    (SELECT get_user_primary_role(id)::text), 
    'player'
  )
) STORED;

-- Créer un index sur la colonne calculée pour les performances
CREATE INDEX IF NOT EXISTS idx_profiles_user_type_computed ON public.profiles(user_type_computed);

-- Étape 8: Mise à jour des RLS policies pour utiliser les nouvelles fonctions
-- Supprimer les anciennes policies basées sur user_type et les remplacer

-- Exemple pour owner_applications - utiliser has_role au lieu de profiles.user_type
DROP POLICY IF EXISTS "Admins can view all applications" ON public.owner_applications;
DROP POLICY IF EXISTS "Admins can update all applications" ON public.owner_applications;

CREATE POLICY "Admins can view all applications" 
ON public.owner_applications 
FOR SELECT 
USING (has_any_role(auth.uid(), ARRAY['super_admin','admin_general','admin_fields']::user_role_type[]));

CREATE POLICY "Admins can update all applications" 
ON public.owner_applications 
FOR UPDATE 
USING (has_any_role(auth.uid(), ARRAY['super_admin','admin_general','admin_fields']::user_role_type[]));
