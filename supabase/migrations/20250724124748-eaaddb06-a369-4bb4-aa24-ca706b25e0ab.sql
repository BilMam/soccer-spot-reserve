-- Ajouter le statut 'blocked' pour les payouts sans compte de payout
-- Date: 2025-07-24

-- Pas besoin de modifier la structure, juste permettre le nouveau statut 'blocked'
-- dans les enum existants si nécessaire

-- Optionnel: Ajouter une colonne pour stocker les erreurs détaillées
ALTER TABLE payouts 
ADD COLUMN IF NOT EXISTS error_message TEXT;

-- Index pour rechercher les payouts bloqués
CREATE INDEX IF NOT EXISTS idx_payouts_blocked ON payouts(status) WHERE status = 'blocked';