-- Ajouter la colonne updated_at manquante à cagnotte_contribution
ALTER TABLE cagnotte_contribution 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Créer la fonction de trigger pour updated_at
CREATE OR REPLACE FUNCTION update_cagnotte_contribution_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer le trigger
DROP TRIGGER IF EXISTS set_cagnotte_contribution_updated_at ON cagnotte_contribution;
CREATE TRIGGER set_cagnotte_contribution_updated_at
BEFORE UPDATE ON cagnotte_contribution
FOR EACH ROW
EXECUTE FUNCTION update_cagnotte_contribution_updated_at();

-- Initialiser updated_at pour les lignes existantes
UPDATE cagnotte_contribution 
SET updated_at = COALESCE(refund_last_attempt_at, refunded_at, paid_at, created_at)
WHERE updated_at IS NULL;