-- Étape finale: Supprimer la colonne user_type obsolète
-- Alternative: La garder mais la rendre obsolète avec un commentaire
COMMENT ON COLUMN public.profiles.user_type IS 'DEPRECATED: Use user_roles table instead. This column will be removed in a future migration.';

-- Optionnel: On peut aussi la rendre non-modifiable
-- ALTER TABLE public.profiles ALTER COLUMN user_type SET DEFAULT 'deprecated';

-- Mise à jour finale des edge functions qui pourraient encore référencer user_type
-- (aucune action SQL requise, les edge functions utilisent maintenant les rôles)

-- Log de fin de migration
INSERT INTO public.role_audit_log (
  action_type, target_user_id, performed_by, old_value, new_value, reason
) VALUES (
  'system_migration', '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000', 
  'user_type_based', 'user_roles_only', 'Completed unification migration to user_roles system'
);