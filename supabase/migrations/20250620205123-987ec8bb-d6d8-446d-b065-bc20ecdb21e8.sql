
-- Supprimer d'abord le trigger avant la fonction
DROP TRIGGER IF EXISTS trigger_escrow_automation ON public.bookings;

-- Supprimer les fonctions liées à l'escrow
DROP FUNCTION IF EXISTS public.process_escrow_transaction(uuid, text, numeric, text, numeric);
DROP FUNCTION IF EXISTS public.schedule_escrow_task(uuid, text, timestamp with time zone);
DROP FUNCTION IF EXISTS public.confirm_booking_by_owner(uuid, uuid);
DROP FUNCTION IF EXISTS public.process_automation_tasks();
DROP FUNCTION IF EXISTS public.trigger_schedule_escrow_tasks();
DROP FUNCTION IF EXISTS public.calculate_smart_confirmation_deadline(date, time without time zone);
DROP FUNCTION IF EXISTS public.process_smart_booking_confirmation(uuid, text, numeric, text, numeric);
DROP FUNCTION IF EXISTS public.process_smart_automation_tasks();
DROP FUNCTION IF EXISTS public.validate_payment_link(text);

-- Supprimer les tables d'escrow et d'automatisation
DROP TABLE IF EXISTS public.escrow_automation_tasks CASCADE;
DROP TABLE IF EXISTS public.escrow_transactions CASCADE;
DROP TABLE IF EXISTS public.platform_balance CASCADE;
DROP TABLE IF EXISTS public.payment_links CASCADE;

-- Supprimer les colonnes CinetPay/escrow de la table bookings
ALTER TABLE public.bookings 
DROP COLUMN IF EXISTS cinetpay_transaction_id,
DROP COLUMN IF EXISTS escrow_status,
DROP COLUMN IF EXISTS confirmation_deadline,
DROP COLUMN IF EXISTS auto_refund_processed,
DROP COLUMN IF EXISTS owner_confirmed_at,
DROP COLUMN IF EXISTS transfer_scheduled_at,
DROP COLUMN IF EXISTS owner_confirmation_sent_at,
DROP COLUMN IF EXISTS final_reminder_sent_at,
DROP COLUMN IF EXISTS payment_provider,
DROP COLUMN IF EXISTS confirmation_window_type,
DROP COLUMN IF EXISTS auto_action,
DROP COLUMN IF EXISTS time_until_slot;

-- Supprimer les colonnes CinetPay de la table payment_accounts
ALTER TABLE public.payment_accounts 
DROP COLUMN IF EXISTS merchant_id,
DROP COLUMN IF EXISTS external_account_id,
DROP COLUMN IF EXISTS payment_provider,
DROP COLUMN IF EXISTS account_type,
DROP COLUMN IF EXISTS account_status,
DROP COLUMN IF EXISTS onboarding_url,
DROP COLUMN IF EXISTS details_submitted,
DROP COLUMN IF EXISTS charges_enabled,
DROP COLUMN IF EXISTS payouts_enabled;

-- Supprimer les colonnes CinetPay du profil utilisateur
ALTER TABLE public.profiles 
DROP COLUMN IF EXISTS cinetpay_onboarding_completed,
DROP COLUMN IF EXISTS cinetpay_account_verified,
DROP COLUMN IF EXISTS stripe_onboarding_completed,
DROP COLUMN IF EXISTS stripe_account_verified;

-- Nettoyer la table payment_accounts (la garder mais vide pour futur usage)
TRUNCATE TABLE public.payment_accounts;

-- Supprimer également la table platform_settings qui était liée au système intelligent
DROP TABLE IF EXISTS public.platform_settings CASCADE;
