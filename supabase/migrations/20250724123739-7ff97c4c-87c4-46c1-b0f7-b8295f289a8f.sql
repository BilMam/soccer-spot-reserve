-- Migration: Ajouter payout_attempted_at pour tracer les retries
-- Date: 2025-07-24

-- Ajouter le champ payout_attempted_at pour tracer les tentatives de transfert
ALTER TABLE payouts 
ADD COLUMN IF NOT EXISTS payout_attempted_at TIMESTAMP WITH TIME ZONE;

-- Créer un index pour les requêtes sur les retries
CREATE INDEX IF NOT EXISTS idx_payouts_attempted_at ON payouts(payout_attempted_at);

-- Mettre à jour les payouts existants pour marquer le timestamp
UPDATE payouts 
SET payout_attempted_at = updated_at 
WHERE payout_attempted_at IS NULL 
  AND status IN ('pending', 'waiting_funds', 'failed', 'completed');