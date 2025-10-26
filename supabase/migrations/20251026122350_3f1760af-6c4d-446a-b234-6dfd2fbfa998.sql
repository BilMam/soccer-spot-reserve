-- Ajouter la colonne sport_type à la table fields
ALTER TABLE fields 
ADD COLUMN sport_type text NOT NULL DEFAULT 'football';

-- Créer un index pour optimiser les recherches par sport
CREATE INDEX idx_fields_sport_type ON fields(sport_type);

-- Ajouter une contrainte pour valider les valeurs
ALTER TABLE fields 
ADD CONSTRAINT valid_sport_type 
CHECK (sport_type IN ('football', 'tennis', 'paddle', 'basketball'));