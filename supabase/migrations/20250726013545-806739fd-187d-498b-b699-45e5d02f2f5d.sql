-- Étape 2: Migrer les rôles existants vers le système simplifié
-- Migrer tous les admin_* vers 'admin'
UPDATE public.user_roles 
SET role = 'admin'
WHERE role IN ('admin_general', 'admin_fields', 'admin_users', 'moderator');

-- Supprimer les doublons potentiels après migration
DELETE FROM public.user_roles 
WHERE id NOT IN (
    SELECT DISTINCT ON (user_id, role) id
    FROM public.user_roles
    ORDER BY user_id, role, granted_at DESC
);

-- Supprimer la colonne user_type de profiles (plus nécessaire)
ALTER TABLE public.profiles DROP COLUMN IF EXISTS user_type;