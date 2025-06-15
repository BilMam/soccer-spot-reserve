
-- Renommer la table stripe_accounts en payment_accounts pour être plus générique
ALTER TABLE public.stripe_accounts RENAME TO payment_accounts;

-- Renommer les colonnes pour être plus génériques
ALTER TABLE public.payment_accounts 
RENAME COLUMN stripe_account_id TO external_account_id;

-- Ajouter une colonne pour identifier le provider de paiement
ALTER TABLE public.payment_accounts 
ADD COLUMN payment_provider TEXT NOT NULL DEFAULT 'cinetpay';

-- Adapter les colonnes pour CinetPay
ALTER TABLE public.payment_accounts 
ADD COLUMN merchant_id TEXT,
ADD COLUMN account_type TEXT DEFAULT 'merchant';

-- Mettre à jour les index
DROP INDEX IF EXISTS idx_stripe_accounts_owner_id;
DROP INDEX IF EXISTS idx_stripe_accounts_stripe_id;

CREATE INDEX idx_payment_accounts_owner_id ON public.payment_accounts(owner_id);
CREATE INDEX idx_payment_accounts_external_id ON public.payment_accounts(external_account_id);
CREATE INDEX idx_payment_accounts_provider ON public.payment_accounts(payment_provider);

-- Mettre à jour les politiques RLS
DROP POLICY IF EXISTS "Owners can view their own stripe account" ON public.payment_accounts;
DROP POLICY IF EXISTS "Owners can update their own stripe account" ON public.payment_accounts;
DROP POLICY IF EXISTS "Allow insert from edge functions" ON public.payment_accounts;

CREATE POLICY "Owners can view their own payment account" 
ON public.payment_accounts 
FOR SELECT 
USING (auth.uid() = owner_id);

CREATE POLICY "Owners can update their own payment account" 
ON public.payment_accounts 
FOR UPDATE 
USING (auth.uid() = owner_id);

CREATE POLICY "Allow insert from edge functions" 
ON public.payment_accounts 
FOR INSERT 
WITH CHECK (true);

-- Adapter la table bookings pour CinetPay
ALTER TABLE public.bookings 
ADD COLUMN cinetpay_transaction_id TEXT,
ADD COLUMN payment_provider TEXT DEFAULT 'cinetpay';

-- Ajouter index pour les transactions CinetPay
CREATE INDEX idx_bookings_cinetpay_transaction ON public.bookings(cinetpay_transaction_id);
CREATE INDEX idx_bookings_payment_provider ON public.bookings(payment_provider);

-- Adapter les colonnes profiles pour CinetPay
ALTER TABLE public.profiles 
ADD COLUMN cinetpay_onboarding_completed BOOLEAN DEFAULT false,
ADD COLUMN cinetpay_account_verified BOOLEAN DEFAULT false;
