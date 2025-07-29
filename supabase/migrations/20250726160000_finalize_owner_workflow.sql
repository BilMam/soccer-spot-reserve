-- Migration: Finaliser le workflow owner approval
-- Ajouter colonnes manquantes et nettoyer le schéma

-- Step 1: Ajouter was_already_existing dans payment_accounts si manquant
ALTER TABLE payment_accounts 
ADD COLUMN IF NOT EXISTS was_already_existing BOOLEAN DEFAULT FALSE;

-- Step 2: Ajouter contrainte UNIQUE sur user_id dans owner_applications (une application par user)
CREATE UNIQUE INDEX IF NOT EXISTS idx_owner_applications_user_id_unique 
ON owner_applications (user_id);

-- Step 3: Nettoyer toute donnée redondante (au cas où)
-- Supprimer les doublons d'applications en gardant la plus récente
WITH duplicate_apps AS (
  SELECT user_id, 
         array_agg(id ORDER BY created_at DESC) as ids
  FROM owner_applications 
  GROUP BY user_id 
  HAVING COUNT(*) > 1
)
DELETE FROM owner_applications 
WHERE id IN (
  SELECT unnest(ids[2:]) 
  FROM duplicate_apps
);

-- Step 4: Mise à jour des commentaires pour clarifier le workflow
COMMENT ON TABLE owner_applications IS 'Applications de propriétaires - nouveau workflow uniquement. Un utilisateur ne peut avoir qu''une seule application.';
COMMENT ON TABLE payment_accounts IS 'Comptes de paiement CinetPay - créés lors de l''approbation admin via create-owner-contact';

-- Step 5: Ajouter index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_payment_accounts_lookup 
ON payment_accounts (owner_id, payment_provider, account_type, cinetpay_contact_added);

-- Step 6: Vérifier l'intégrité des données
DO $$
DECLARE
  pending_count INTEGER;
  account_count INTEGER;
  orphan_count INTEGER;
BEGIN
  -- Compter les applications en attente
  SELECT COUNT(*) INTO pending_count FROM owner_applications WHERE status = 'pending';
  
  -- Compter les comptes de paiement
  SELECT COUNT(*) INTO account_count FROM payment_accounts WHERE payment_provider = 'cinetpay';
  
  -- Compter les propriétaires orphelins (dans owners mais pas dans owner_applications)
  SELECT COUNT(*) INTO orphan_count 
  FROM owners o 
  WHERE NOT EXISTS (
    SELECT 1 FROM owner_applications oa WHERE oa.user_id = o.user_id
  ) AND o.status = 'pending';
  
  RAISE NOTICE 'Workflow finalization completed:';
  RAISE NOTICE '- Pending applications: %', pending_count;
  RAISE NOTICE '- CinetPay payment accounts: %', account_count;
  RAISE NOTICE '- Orphan owners (need migration): %', orphan_count;
  
  IF orphan_count > 0 THEN
    RAISE NOTICE 'Run migrate-legacy-owners function to migrate orphan owners';
  END IF;
END $$;