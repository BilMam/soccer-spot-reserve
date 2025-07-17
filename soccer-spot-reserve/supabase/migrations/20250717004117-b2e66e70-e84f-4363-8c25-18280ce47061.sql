-- Étendre la table payment_accounts pour supporter les contacts CinetPay Transfer
ALTER TABLE public.payment_accounts 
ADD COLUMN IF NOT EXISTS payment_provider TEXT DEFAULT 'cinetpay',
ADD COLUMN IF NOT EXISTS external_account_id TEXT,
ADD COLUMN IF NOT EXISTS merchant_id TEXT,
ADD COLUMN IF NOT EXISTS account_type TEXT DEFAULT 'contact',
ADD COLUMN IF NOT EXISTS owner_name TEXT,
ADD COLUMN IF NOT EXISTS owner_surname TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS country_prefix TEXT DEFAULT '225',
ADD COLUMN IF NOT EXISTS cinetpay_contact_added BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS cinetpay_contact_status JSONB,
ADD COLUMN IF NOT EXISTS cinetpay_contact_response JSONB;

-- Créer des index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_payment_accounts_provider ON public.payment_accounts(payment_provider);
CREATE INDEX IF NOT EXISTS idx_payment_accounts_contact_added ON public.payment_accounts(cinetpay_contact_added);
CREATE INDEX IF NOT EXISTS idx_payment_accounts_phone ON public.payment_accounts(phone);

-- Ajouter une contrainte unique pour éviter les doublons de contacts
CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_accounts_unique_contact 
ON public.payment_accounts(payment_provider, phone) 
WHERE payment_provider = 'cinetpay' AND account_type = 'contact';