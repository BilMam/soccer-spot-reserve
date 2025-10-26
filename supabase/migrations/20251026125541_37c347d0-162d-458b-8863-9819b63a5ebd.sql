-- Supprimer l'ancienne contrainte CHECK sur field_type
-- Cette contrainte limitait les valeurs à ('natural_grass', 'synthetic', 'indoor', 'street')
-- ce qui empêchait l'ajout de nouveaux types de surface (parquet, terre battue, gazon synthétique, etc.)

ALTER TABLE public.fields DROP CONSTRAINT IF EXISTS fields_field_type_check;

-- Le champ field_type reste de type TEXT sans contrainte CHECK
-- Les validations se feront côté application (constants/sports.ts)