-- Créer une fonction simple pour tester le bon fonctionnement du système de rôles
CREATE OR REPLACE FUNCTION public.test_role_system()
RETURNS boolean
LANGUAGE sql
AS $$
  SELECT has_role(auth.uid(), 'admin');
$$;

-- Vérifier maintenant la version actuelle de la table user_roles
SELECT column_name, data_type, udt_name FROM information_schema.columns 
WHERE table_name = 'user_roles' AND table_schema = 'public' AND column_name = 'role';