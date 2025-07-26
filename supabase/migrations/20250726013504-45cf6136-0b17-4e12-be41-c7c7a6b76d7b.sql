-- Migration: Simplification du système de rôles (3 rôles + super_admin)

-- 1. Migrer les rôles existants vers le système simplifié
-- Tous les admin_* deviennent 'admin_general' temporairement (on utilisera 'admin' plus tard)
UPDATE public.user_roles 
SET role = 'admin_general'
WHERE role IN ('admin_fields', 'admin_users');

-- Les moderators deviennent 'admin_general' aussi
UPDATE public.user_roles 
SET role = 'admin_general'
WHERE role = 'moderator';

-- 2. Supprimer les doublons potentiels après migration
DELETE FROM public.user_roles 
WHERE id NOT IN (
    SELECT DISTINCT ON (user_id, role) id
    FROM public.user_roles
    ORDER BY user_id, role, granted_at DESC
);

-- 3. Ajouter la nouvelle valeur 'admin' à l'enum
ALTER TYPE user_role_type ADD VALUE 'admin';

-- 4. Migrer admin_general vers admin
UPDATE public.user_roles SET role = 'admin' WHERE role = 'admin_general';

-- 5. Supprimer les anciennes valeurs de l'enum (création d'un nouveau type simplifié)
-- Comme PostgreSQL ne permet pas de supprimer des valeurs d'enum, on crée un nouveau type
CREATE TYPE user_role_type_new AS ENUM ('super_admin', 'admin', 'owner', 'player');

-- 6. Mettre à jour la table pour utiliser le nouveau type
ALTER TABLE public.user_roles ALTER COLUMN role TYPE user_role_type_new USING role::text::user_role_type_new;

-- 7. Supprimer l'ancien type et renommer
DROP TYPE user_role_type;
ALTER TYPE user_role_type_new RENAME TO user_role_type;

-- 8. Supprimer la colonne user_type de profiles (plus nécessaire)
ALTER TABLE public.profiles DROP COLUMN IF EXISTS user_type;

-- 9. Mettre à jour les RLS policies pour utiliser le nouveau système
DROP POLICY IF EXISTS "Admins can manage applications" ON public.owner_applications;
CREATE POLICY "Admins can manage applications" 
ON public.owner_applications 
FOR ALL 
USING (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can update all applications" ON public.owner_applications;
DROP POLICY IF EXISTS "Admins can view all applications" ON public.owner_applications;