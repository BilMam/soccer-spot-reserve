-- Migration: Refactorisation système de paiement CinetPay
-- 1. Créer table payouts pour les transferts vers propriétaires
CREATE TABLE public.payouts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID NOT NULL REFERENCES public.bookings(id),
  owner_id UUID NOT NULL,
  amount INTEGER NOT NULL,
  platform_fee_owner INTEGER NOT NULL,
  cinetpay_transfer_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  transfer_response JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. Ajouter nouvelles colonnes aux bookings pour la nouvelle structure des frais
ALTER TABLE public.bookings 
ADD COLUMN field_price NUMERIC DEFAULT 0,
ADD COLUMN platform_fee_user NUMERIC DEFAULT 0,
ADD COLUMN platform_fee_owner NUMERIC DEFAULT 0,
ADD COLUMN cinetpay_checkout_fee NUMERIC DEFAULT 0,
ADD COLUMN cinetpay_transfer_id TEXT;

-- 3. Migrer stripe_transfer_id vers cinetpay_transfer_id
UPDATE public.bookings 
SET cinetpay_transfer_id = stripe_transfer_id 
WHERE stripe_transfer_id IS NOT NULL;

-- 4. Supprimer colonne stripe_transfer_id
ALTER TABLE public.bookings DROP COLUMN stripe_transfer_id;

-- 5. RLS pour table payouts
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view their own payouts" 
ON public.payouts 
FOR SELECT 
USING (auth.uid() = owner_id);

CREATE POLICY "System can manage payouts" 
ON public.payouts 
FOR ALL 
USING (true);

-- 6. Index pour performance
CREATE INDEX idx_payouts_booking_id ON public.payouts(booking_id);
CREATE INDEX idx_payouts_owner_id ON public.payouts(owner_id);
CREATE INDEX idx_payouts_status ON public.payouts(status);
CREATE INDEX idx_bookings_cinetpay_transfer ON public.bookings(cinetpay_transfer_id);