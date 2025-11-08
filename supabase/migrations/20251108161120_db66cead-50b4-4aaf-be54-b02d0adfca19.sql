-- Phase 3: Nettoyer les références CinetPay et passer à PayDunya

-- 1. Renommer cinetpay_transfer_id en paydunya_transfer_id dans bookings
ALTER TABLE public.bookings 
RENAME COLUMN cinetpay_transfer_id TO paydunya_transfer_id;

-- 2. Renommer cinetpay_transfer_id en paydunya_transfer_id dans payouts
ALTER TABLE public.payouts 
RENAME COLUMN cinetpay_transfer_id TO paydunya_transfer_id;

-- 3. Ajouter index pour paydunya_transfer_id dans payouts
CREATE INDEX IF NOT EXISTS idx_payouts_paydunya_transfer 
ON public.payouts(paydunya_transfer_id) 
WHERE paydunya_transfer_id IS NOT NULL;

-- 4. Supprimer cinetpay_contact_id de payout_accounts
ALTER TABLE public.payout_accounts 
DROP COLUMN IF EXISTS cinetpay_contact_id,
DROP COLUMN IF EXISTS cinetpay_contact_status,
DROP COLUMN IF EXISTS cinetpay_contact_response,
DROP COLUMN IF EXISTS cinetpay_contact_added;

-- 5. Supprimer cinetpay_contact_id de owners
ALTER TABLE public.owners 
DROP COLUMN IF EXISTS cinetpay_contact_id;

-- 6. Supprimer les colonnes CinetPay obsolètes de bookings
ALTER TABLE public.bookings 
DROP COLUMN IF EXISTS cinetpay_checkout_fee;

-- 7. Supprimer les colonnes CinetPay obsolètes de profiles
ALTER TABLE public.profiles 
DROP COLUMN IF EXISTS cinetpay_onboarding_completed,
DROP COLUMN IF EXISTS cinetpay_account_verified;

-- 8. Supprimer l'index CinetPay obsolète
DROP INDEX IF EXISTS idx_owners_cinetpay_contact;

-- 9. Commenter le changement
COMMENT ON COLUMN public.bookings.paydunya_transfer_id IS 'ID de la transaction PayDunya pour le payout propriétaire';
COMMENT ON COLUMN public.payouts.paydunya_transfer_id IS 'ID de la transaction PayDunya Direct Pay v2';

-- 10. Migration terminée
-- Les edge functions CinetPay seront supprimées séparément après migration du frontend