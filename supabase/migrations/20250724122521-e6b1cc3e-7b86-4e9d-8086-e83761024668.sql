-- Migration: Ajouter contraintes FK et réparer le flux payout
-- Date: 2025-07-24

-- 1. Ajouter les contraintes de clés étrangères
ALTER TABLE fields
  ADD CONSTRAINT fk_fields_owner
  FOREIGN KEY (owner_id) REFERENCES owners(user_id);

ALTER TABLE payout_accounts
  ADD CONSTRAINT fk_payout_accounts_owner
  FOREIGN KEY (owner_id) REFERENCES owners(id);

-- 2. Mettre à jour le payout_account pour ajouter un contact_id temporaire (à remplacer par le vrai)
UPDATE payout_accounts 
SET cinetpay_contact_id = 'CONTACT_TEMP_001' 
WHERE owner_id = '38bf15a8-e44e-4426-a331-e792d708e0f0' 
  AND cinetpay_contact_id IS NULL;

-- 3. Index pour optimiser les requêtes payout
CREATE INDEX IF NOT EXISTS idx_payouts_booking_status ON payouts(booking_id, status);
CREATE INDEX IF NOT EXISTS idx_owners_user_id ON owners(user_id);
CREATE INDEX IF NOT EXISTS idx_payout_accounts_owner_active ON payout_accounts(owner_id, is_active);