
-- D'abord, supprimer l'ancienne contrainte
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_user_type_check;

-- Créer une nouvelle contrainte qui inclut tous les types d'utilisateurs
ALTER TABLE public.profiles ADD CONSTRAINT profiles_user_type_check 
  CHECK (user_type IN ('player', 'owner', 'admin', 'super_admin', 'admin_general', 'admin_fields', 'admin_users', 'moderator'));

-- Créer l'enum pour les types de rôles
CREATE TYPE public.user_role_type AS ENUM (
  'super_admin',
  'admin_general', 
  'admin_fields',
  'admin_users',
  'moderator',
  'owner',
  'player'
);

-- Table pour les rôles utilisateurs avec hiérarchie
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role_type NOT NULL,
  granted_by UUID REFERENCES auth.users(id),
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Table d'audit pour tracer toutes les actions
CREATE TABLE public.role_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type TEXT NOT NULL,
  target_user_id UUID NOT NULL REFERENCES auth.users(id),
  performed_by UUID NOT NULL REFERENCES auth.users(id),
  old_value TEXT,
  new_value TEXT,
  reason TEXT,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Activer RLS sur les nouvelles tables
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_audit_log ENABLE ROW LEVEL SECURITY;

-- Fonction pour vérifier si un utilisateur a un rôle spécifique
CREATE OR REPLACE FUNCTION public.has_role(user_uuid UUID, role_name user_role_type)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = user_uuid 
    AND role = role_name 
    AND is_active = true 
    AND (expires_at IS NULL OR expires_at > now())
  );
$$;

-- Fonction pour vérifier si un utilisateur peut promouvoir un autre
CREATE OR REPLACE FUNCTION public.can_promote_user(promoter_id UUID, target_role user_role_type)
RETURNS BOOLEAN
LANGUAGE PLPGSQL
SECURITY DEFINER
AS $$
BEGIN
  -- Super admin peut tout faire
  IF has_role(promoter_id, 'super_admin') THEN
    RETURN true;
  END IF;
  
  -- Admin général peut créer des admins spécialisés et en dessous
  IF has_role(promoter_id, 'admin_general') AND target_role IN ('admin_fields', 'admin_users', 'moderator', 'owner', 'player') THEN
    RETURN true;
  END IF;
  
  -- Admin fields peut seulement gérer les propriétaires
  IF has_role(promoter_id, 'admin_fields') AND target_role IN ('owner', 'player') THEN
    RETURN true;
  END IF;
  
  -- Admin users peut gérer les joueurs et modérateurs
  IF has_role(promoter_id, 'admin_users') AND target_role IN ('moderator', 'player') THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;

-- Fonction principale pour changer le type d'utilisateur avec audit
CREATE OR REPLACE FUNCTION public.change_user_type(
  target_user_id UUID,
  new_user_type TEXT,
  new_role user_role_type DEFAULT NULL,
  reason TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE PLPGSQL
SECURITY DEFINER
AS $$
DECLARE
  current_user_type TEXT;
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
  
  -- Récupérer l'état actuel
  SELECT user_type INTO current_user_type FROM public.profiles WHERE id = target_user_id;
  
  -- Mettre à jour le user_type dans profiles
  UPDATE public.profiles 
  SET user_type = new_user_type, updated_at = now()
  WHERE id = target_user_id;
  
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
    'change_user_type', target_user_id, auth.uid(), current_user_type, new_user_type, reason
  );
END;
$$;

-- Fonction pour accorder un rôle
CREATE OR REPLACE FUNCTION public.grant_role_to_user(
  target_user_id UUID,
  role_to_grant user_role_type,
  reason TEXT DEFAULT NULL,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS VOID
LANGUAGE PLPGSQL
SECURITY DEFINER
AS $$
BEGIN
  -- Vérifier les permissions
  IF NOT can_promote_user(auth.uid(), role_to_grant) THEN
    RAISE EXCEPTION 'Permissions insuffisantes pour accorder ce rôle';
  END IF;
  
  -- Empêcher l'auto-promotion vers super_admin
  IF role_to_grant = 'super_admin' AND auth.uid() = target_user_id AND NOT has_role(auth.uid(), 'super_admin') THEN
    RAISE EXCEPTION 'Auto-promotion vers super_admin interdite';
  END IF;
  
  -- Accorder le rôle
  INSERT INTO public.user_roles (user_id, role, granted_by, notes, expires_at)
  VALUES (target_user_id, role_to_grant, auth.uid(), reason, expires_at)
  ON CONFLICT (user_id, role) 
  DO UPDATE SET 
    granted_by = auth.uid(), 
    granted_at = now(), 
    is_active = true,
    notes = reason,
    expires_at = EXCLUDED.expires_at;
  
  -- Audit log
  INSERT INTO public.role_audit_log (
    action_type, target_user_id, performed_by, new_value, reason
  ) VALUES (
    'grant_role', target_user_id, auth.uid(), role_to_grant::text, reason
  );
END;
$$;

-- Fonction pour révoquer un rôle
CREATE OR REPLACE FUNCTION public.revoke_role_from_user(
  target_user_id UUID,
  role_to_revoke user_role_type,
  reason TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE PLPGSQL
SECURITY DEFINER
AS $$
BEGIN
  -- Vérifier les permissions
  IF NOT can_promote_user(auth.uid(), role_to_revoke) THEN
    RAISE EXCEPTION 'Permissions insuffisantes pour révoquer ce rôle';
  END IF;
  
  -- Empêcher de se révoquer son propre rôle de super_admin
  IF role_to_revoke = 'super_admin' AND auth.uid() = target_user_id THEN
    RAISE EXCEPTION 'Impossible de se révoquer son propre rôle de super_admin';
  END IF;
  
  -- Révoquer le rôle
  UPDATE public.user_roles 
  SET is_active = false, updated_at = now()
  WHERE user_id = target_user_id AND role = role_to_revoke;
  
  -- Audit log
  INSERT INTO public.role_audit_log (
    action_type, target_user_id, performed_by, old_value, reason
  ) VALUES (
    'revoke_role', target_user_id, auth.uid(), role_to_revoke::text, reason
  );
END;
$$;

-- Fonction pour obtenir tous les utilisateurs avec leurs rôles
CREATE OR REPLACE FUNCTION public.get_users_with_roles()
RETURNS TABLE(
  user_id UUID,
  email TEXT,
  full_name TEXT,
  user_type TEXT,
  roles user_role_type[],
  created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT 
    p.id,
    p.email,
    p.full_name,
    p.user_type,
    COALESCE(array_agg(ur.role) FILTER (WHERE ur.is_active = true), '{}') as roles,
    p.created_at
  FROM public.profiles p
  LEFT JOIN public.user_roles ur ON p.id = ur.user_id AND ur.is_active = true 
    AND (ur.expires_at IS NULL OR ur.expires_at > now())
  WHERE has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin_general') OR has_role(auth.uid(), 'admin_users')
  GROUP BY p.id, p.email, p.full_name, p.user_type, p.created_at
  ORDER BY p.created_at DESC;
$$;

-- Politiques RLS pour user_roles
CREATE POLICY "Super admins and general admins can view all roles"
  ON public.user_roles FOR SELECT
  USING (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin_general'));

CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (user_id = auth.uid());

-- Politiques RLS pour role_audit_log
CREATE POLICY "Super admins can view all audit logs"
  ON public.role_audit_log FOR SELECT
  USING (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "General admins can view relevant audit logs"
  ON public.role_audit_log FOR SELECT
  USING (has_role(auth.uid(), 'admin_general'));

-- Mettre à jour les politiques existantes pour inclure les nouveaux rôles
DROP POLICY IF EXISTS "Admins can manage applications" ON public.owner_applications;
CREATE POLICY "Admins can manage applications"
  ON public.owner_applications FOR ALL
  USING (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin_general') OR has_role(auth.uid(), 'admin_fields'));

-- Créer le premier super admin
DO $$
DECLARE
  admin_user_id UUID;
BEGIN
  -- Trouver l'utilisateur par email
  SELECT id INTO admin_user_id 
  FROM public.profiles 
  WHERE email = 'dia.mamadoubilo@gmail.com';
  
  IF admin_user_id IS NOT NULL THEN
    -- Mettre à jour le user_type
    UPDATE public.profiles 
    SET user_type = 'super_admin' 
    WHERE id = admin_user_id;
    
    -- Accorder le rôle super_admin
    INSERT INTO public.user_roles (user_id, role, granted_by, notes)
    VALUES (admin_user_id, 'super_admin', admin_user_id, 'Initial super admin setup')
    ON CONFLICT DO NOTHING;
    
    RAISE NOTICE 'Super admin créé pour l''utilisateur: %', admin_user_id;
  ELSE
    RAISE NOTICE 'Utilisateur avec email dia.mamadoubilo@gmail.com non trouvé';
  END IF;
END $$;
