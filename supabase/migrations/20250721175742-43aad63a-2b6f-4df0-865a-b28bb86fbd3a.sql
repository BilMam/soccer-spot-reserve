-- Étape finale: Marquer la colonne user_type comme obsolète
COMMENT ON COLUMN public.profiles.user_type IS 'DEPRECATED: Use user_roles table instead. This column will be removed in a future migration.';

-- La migration de refactorisation des rôles est maintenant terminée
-- Toutes les fonctions et le code frontend utilisent maintenant user_roles exclusivement