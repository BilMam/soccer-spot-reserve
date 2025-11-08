-- Script pour marquer les contributions déjà remboursées manuellement
-- ⚠️ À ADAPTER : Remplacez les IDs par ceux des contributions effectivement remboursées

-- 📋 Liste des 12 contributions en attente de remboursement trouvées :
-- 
-- ID                                      | Montant | Statut
-- ----------------------------------------|---------|--------
-- 97eedeca-17c2-42fe-8af3-4bff36129add    | 258 XOF | PENDING
-- 47ade69c-fe15-4375-bbd8-50dc63751fb7    | 258 XOF | PENDING
-- c2f4f4bf-269e-4f0e-9c02-bb5d070e8990    | 258 XOF | PENDING
-- 199e6d46-d804-4807-b79f-1b4fbe92b401    | 258 XOF | PENDING
-- 69391924-f585-4f47-95b3-d4f61d6dc7d8    | 258 XOF | PENDING
-- f05145e4-b53a-46cf-84e8-c70a59443294    | 258 XOF | PENDING
-- fbcd88a0-c582-45d5-98ab-feb5a2a1eff3    | 773 XOF | PENDING
-- 6998f75f-5c12-4584-a4c8-fd37346884fd    | 773 XOF | PENDING
-- b8a87669-d7e9-43b8-909b-315b5638ec11    | 773 XOF | PENDING
-- d4ef95d2-0de9-43b2-9168-a473bf12af4f    | 387 XOF | PENDING
-- e8664564-6ea0-4708-9676-ddd12e6f3395    | 387 XOF | PENDING
-- 45cf9509-c4ad-4761-9500-68fcb16939d5    | 200 XOF | PENDING

-- 🎯 ÉTAPE 1 : Identifier les montants reçus via PayDunya
-- Vérifiez votre historique PayDunya pour voir quels montants vous avez RÉELLEMENT reçus
-- L'utilisateur a mentionné : 262 F, 393 F, 785 F, etc. (11 paiements)
-- Ces montants peuvent différer légèrement des montants stockés (frais PSP)

-- 🎯 ÉTAPE 2 : Marquer les contributions déjà remboursées
-- Remplacez cette liste par les IDs correspondant aux montants reçus
UPDATE cagnotte_contribution
SET 
  refund_status = 'REFUNDED',
  refund_reference = 'MANUAL_PAYDUNYA_CONFIRMED',
  refund_attempt_count = 1,
  refund_last_attempt_at = NOW(),
  refunded_at = NOW(),
  updated_at = NOW()
WHERE id IN (
  -- ⚠️ REMPLACEZ CES IDs PAR CEUX DES CONTRIBUTIONS EFFECTIVEMENT REMBOURSÉES
  -- Exemple (à adapter selon votre historique PayDunya) :
  -- '97eedeca-17c2-42fe-8af3-4bff36129add', -- 258 XOF → reçu 262 F
  -- '47ade69c-fe15-4375-bbd8-50dc63751fb7', -- 258 XOF → reçu 262 F
  -- 'fbcd88a0-c582-45d5-98ab-feb5a2a1eff3', -- 773 XOF → reçu 785 F
  -- 'd4ef95d2-0de9-43b2-9168-a473bf12af4f', -- 387 XOF → reçu 393 F
  -- ... continuez avec les 11 IDs correspondant aux paiements reçus
  '00000000-0000-0000-0000-000000000000' -- Placeholder, à remplacer !
)
AND refund_status = 'PENDING'; -- Sécurité : ne marquer que les PENDING

-- 🎯 ÉTAPE 3 : Vérifier le résultat
SELECT 
  id,
  amount,
  refund_status,
  refund_reference,
  refunded_at
FROM cagnotte_contribution
WHERE refund_reference = 'MANUAL_PAYDUNYA_CONFIRMED'
ORDER BY amount;

-- 🎯 ÉTAPE 4 : Vérifier qu'il reste bien 1 contribution en PENDING (la 12ème)
SELECT 
  id,
  amount,
  refund_status,
  refund_reference
FROM cagnotte_contribution
WHERE refund_status = 'PENDING'
ORDER BY amount;

-- ℹ️ NOTE : Les montants peuvent différer légèrement entre :
--   - Le montant stocké dans cagnotte_contribution.amount (ex: 258 XOF)
--   - Le montant reçu via PayDunya (ex: 262 F)
--   - Cette différence peut être due aux frais PSP ou arrondis
