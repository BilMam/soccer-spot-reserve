
-- Table pour stocker les comptes Stripe Connect des propriétaires
CREATE TABLE public.stripe_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_account_id TEXT NOT NULL UNIQUE,
  account_status TEXT NOT NULL DEFAULT 'pending',
  details_submitted BOOLEAN DEFAULT false,
  charges_enabled BOOLEAN DEFAULT false,
  payouts_enabled BOOLEAN DEFAULT false,
  onboarding_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Ajouter des colonnes à la table profiles pour le statut Stripe
ALTER TABLE public.profiles 
ADD COLUMN stripe_onboarding_completed BOOLEAN DEFAULT false,
ADD COLUMN stripe_account_verified BOOLEAN DEFAULT false;

-- Mettre à jour la table bookings pour supporter XOF et les comptes Stripe
ALTER TABLE public.bookings 
ADD COLUMN currency TEXT DEFAULT 'XOF',
ADD COLUMN platform_fee NUMERIC DEFAULT 0,
ADD COLUMN owner_amount NUMERIC DEFAULT 0,
ADD COLUMN stripe_transfer_id TEXT;

-- Mettre à jour la table fields pour utiliser XOF
ALTER TABLE public.fields 
ADD COLUMN currency TEXT DEFAULT 'XOF';

-- Activer RLS sur la table des comptes Stripe
ALTER TABLE public.stripe_accounts ENABLE ROW LEVEL SECURITY;

-- Politique pour que les propriétaires voient leur propre compte Stripe
CREATE POLICY "Owners can view their own stripe account" 
ON public.stripe_accounts 
FOR SELECT 
USING (auth.uid() = owner_id);

-- Politique pour que les propriétaires mettent à jour leur propre compte Stripe
CREATE POLICY "Owners can update their own stripe account" 
ON public.stripe_accounts 
FOR UPDATE 
USING (auth.uid() = owner_id);

-- Politique pour l'insertion (via les fonctions Edge)
CREATE POLICY "Allow insert from edge functions" 
ON public.stripe_accounts 
FOR INSERT 
WITH CHECK (true);

-- Index pour optimiser les requêtes
CREATE INDEX idx_stripe_accounts_owner_id ON public.stripe_accounts(owner_id);
CREATE INDEX idx_stripe_accounts_stripe_id ON public.stripe_accounts(stripe_account_id);
