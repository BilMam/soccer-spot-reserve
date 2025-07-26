-- Migration: Simplification du système de rôles (3 rôles + super_admin)

-- 1. Créer le nouveau type enum simplifié
DROP TYPE IF EXISTS user_role_type CASCADE;
CREATE TYPE user_role_type AS ENUM ('super_admin', 'admin', 'owner', 'player');

-- 2. Migrer les rôles existants vers le nouveau système
-- Tous les admin_* deviennent 'admin'
UPDATE public.user_roles 
SET role = 'admin'::user_role_type 
WHERE role::text IN ('admin_general', 'admin_fields', 'admin_users');

-- Les moderators deviennent 'admin' aussi
UPDATE public.user_roles 
SET role = 'admin'::user_role_type 
WHERE role::text = 'moderator';

-- 3. Supprimer les doublons potentiels après migration
WITH duplicates AS (
  SELECT user_id, role, 
         ROW_NUMBER() OVER (PARTITION BY user_id, role ORDER BY granted_at DESC) as rn
  FROM public.user_roles
)
DELETE FROM public.user_roles 
WHERE (user_id, role, granted_at) IN (
  SELECT user_id, role, granted_at 
  FROM duplicates d
  JOIN public.user_roles ur ON d.user_id = ur.user_id AND d.role = ur.role
  WHERE d.rn > 1
);

-- 4. Mettre à jour la fonction has_role pour le nouveau système
CREATE OR REPLACE FUNCTION public.has_role(user_uuid uuid, role_name user_role_type)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = user_uuid 
    AND role = role_name 
    AND is_active = true 
    AND (expires_at IS NULL OR expires_at > now())
  );
$$;

-- 5. Mettre à jour la fonction can_promote_user pour le nouveau système
CREATE OR REPLACE FUNCTION public.can_promote_user(promoter_id uuid, target_role user_role_type)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Super admin peut tout faire
  IF has_role(promoter_id, 'super_admin') THEN
    RETURN true;
  END IF;
  
  -- Admin peut gérer owner et player
  IF has_role(promoter_id, 'admin') AND target_role IN ('owner', 'player') THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;

-- 6. Supprimer la colonne user_type de profiles (plus nécessaire)
ALTER TABLE public.profiles DROP COLUMN IF EXISTS user_type;

-- 7. Créer une vue pour compatibilité si nécessaire
CREATE OR REPLACE VIEW public.user_profiles_with_roles AS
SELECT 
  p.*,
  COALESCE(
    CASE 
      WHEN has_role(p.id, 'super_admin') THEN 'super_admin'
      WHEN has_role(p.id, 'admin') THEN 'admin'
      WHEN has_role(p.id, 'owner') THEN 'owner'
      ELSE 'player'
    END,
    'player'
  ) as primary_role
FROM public.profiles p;