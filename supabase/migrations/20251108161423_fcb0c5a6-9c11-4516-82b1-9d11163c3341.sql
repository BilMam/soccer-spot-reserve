-- Phase 4: Lier automatiquement les terrains aux payout_accounts (corrigé)

-- 1. Créer des payout_accounts pour les owners qui n'en ont pas encore
INSERT INTO public.payout_accounts (owner_id, label, phone, is_active)
SELECT 
  o.id as owner_id,
  'Compte principal (auto-créé)' as label,
  COALESCE(NULLIF(o.mobile_money, ''), NULLIF(o.phone, ''), '') as phone,
  CASE 
    WHEN COALESCE(NULLIF(o.mobile_money, ''), NULLIF(o.phone, '')) != '' THEN true
    ELSE false
  END as is_active
FROM public.owners o
WHERE NOT EXISTS (
  SELECT 1 
  FROM public.payout_accounts pa 
  WHERE pa.owner_id = o.id
)
ON CONFLICT DO NOTHING;

-- 2. Lier automatiquement les terrains à leurs payout_accounts actifs
UPDATE public.fields f
SET 
  payout_account_id = (
    SELECT pa.id 
    FROM public.payout_accounts pa
    JOIN public.owners o ON pa.owner_id = o.id
    WHERE o.user_id = f.owner_id
      AND pa.is_active = true
    ORDER BY pa.created_at ASC
    LIMIT 1
  ),
  updated_at = NOW()
WHERE payout_account_id IS NULL
  AND EXISTS (
    SELECT 1 
    FROM public.payout_accounts pa
    JOIN public.owners o ON pa.owner_id = o.id
    WHERE o.user_id = f.owner_id
      AND pa.is_active = true
  );

-- 3. Définir le payout_account par défaut pour les owners qui n'en ont pas
UPDATE public.owners o
SET 
  default_payout_account_id = (
    SELECT pa.id 
    FROM public.payout_accounts pa
    WHERE pa.owner_id = o.id
      AND pa.is_active = true
    ORDER BY pa.created_at ASC
    LIMIT 1
  ),
  updated_at = NOW()
WHERE default_payout_account_id IS NULL
  AND EXISTS (
    SELECT 1 
    FROM public.payout_accounts pa
    WHERE pa.owner_id = o.id
      AND pa.is_active = true
  );

-- 4. Créer une vue pour vérifier les terrains sans payout_account
CREATE OR REPLACE VIEW public.fields_without_payout AS
SELECT 
  f.id as field_id,
  f.name as field_name,
  f.owner_id as owner_user_id,
  o.id as owner_id,
  o.phone as owner_phone,
  o.mobile_money as owner_mobile_money,
  COUNT(pa.id) as payout_accounts_count
FROM public.fields f
JOIN public.owners o ON o.user_id = f.owner_id
LEFT JOIN public.payout_accounts pa ON pa.owner_id = o.id
WHERE f.payout_account_id IS NULL
GROUP BY f.id, f.name, f.owner_id, o.id, o.phone, o.mobile_money;

-- 5. Commenter le changement
COMMENT ON VIEW public.fields_without_payout IS 'Vue pour identifier les terrains sans compte de paiement configuré';

-- 6. Logs de migration
DO $$
DECLARE
  fields_updated INTEGER;
  owners_updated INTEGER;
  payout_accounts_created INTEGER;
  fields_without_payout INTEGER;
BEGIN
  SELECT COUNT(*) INTO fields_updated
  FROM public.fields
  WHERE payout_account_id IS NOT NULL;
  
  SELECT COUNT(*) INTO owners_updated
  FROM public.owners
  WHERE default_payout_account_id IS NOT NULL;
  
  SELECT COUNT(*) INTO payout_accounts_created
  FROM public.payout_accounts;
  
  SELECT COUNT(*) INTO fields_without_payout
  FROM public.fields_without_payout;
  
  RAISE NOTICE '✅ Migration Phase 4 terminée:';
  RAISE NOTICE '   - % terrains liés à un payout_account', fields_updated;
  RAISE NOTICE '   - % owners avec un payout_account par défaut', owners_updated;
  RAISE NOTICE '   - % payout_accounts au total', payout_accounts_created;
  RAISE NOTICE '   - ⚠️ % terrains SANS payout_account configuré', fields_without_payout;
END $$;