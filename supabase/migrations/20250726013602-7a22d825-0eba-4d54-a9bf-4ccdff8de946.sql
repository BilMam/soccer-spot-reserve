-- Étape 2b: Migrer les rôles et supprimer les dépendances sur user_type

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

-- Supprimer les policies qui dépendent de user_type
DROP POLICY IF EXISTS "Admins can view all applications" ON public.owner_applications;
DROP POLICY IF EXISTS "Admins can update all applications" ON public.owner_applications;

-- Créer les nouvelles policies utilisant le système de rôles
CREATE POLICY "Admins can view all applications" 
ON public.owner_applications 
FOR SELECT 
USING (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all applications" 
ON public.owner_applications 
FOR UPDATE 
USING (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin'));

-- Maintenant on peut supprimer la colonne user_type
ALTER TABLE public.profiles DROP COLUMN user_type;