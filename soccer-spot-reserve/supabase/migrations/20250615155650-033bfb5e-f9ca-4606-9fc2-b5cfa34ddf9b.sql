
-- Créer d'abord la table payment_links manquante
CREATE TABLE IF NOT EXISTS public.payment_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '48 hours'),
  created_at TIMESTAMPTZ DEFAULT now(),
  used_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true
);

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_payment_links_token ON public.payment_links(token);
CREATE INDEX IF NOT EXISTS idx_payment_links_booking_id ON public.payment_links(booking_id);

-- RLS pour les liens de paiement
ALTER TABLE public.payment_links ENABLE ROW LEVEL SECURITY;

-- Politique pour que les utilisateurs puissent voir leurs propres liens
CREATE POLICY "Users can view their own payment links" ON public.payment_links
  FOR SELECT USING (
    booking_id IN (
      SELECT id FROM public.bookings WHERE user_id = auth.uid()
    )
  );

-- Politique pour que les propriétaires puissent créer des liens pour leurs terrains
CREATE POLICY "Owners can create payment links for their fields" ON public.payment_links
  FOR INSERT WITH CHECK (
    booking_id IN (
      SELECT b.id FROM public.bookings b
      JOIN public.fields f ON b.field_id = f.id
      WHERE f.owner_id = auth.uid()
    )
  );

-- Maintenant, Phase 1: Infrastructure d'Escrow

-- 1. Table pour tracker les transactions d'escrow
CREATE TABLE IF NOT EXISTS public.escrow_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('payment_received', 'transfer_to_owner', 'refund_to_customer')),
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'XOF',
  cinetpay_transaction_id TEXT,
  cinetpay_transfer_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  platform_fee DECIMAL(10,2) DEFAULT 0,
  owner_amount DECIMAL(10,2),
  error_message TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Table pour suivre le solde de la plateforme
CREATE TABLE IF NOT EXISTS public.platform_balance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  total_balance DECIMAL(12,2) NOT NULL DEFAULT 0,
  reserved_balance DECIMAL(12,2) NOT NULL DEFAULT 0,
  available_balance DECIMAL(12,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'XOF',
  last_updated TIMESTAMPTZ DEFAULT now(),
  updated_by TEXT
);

-- Insérer un enregistrement initial pour le solde
INSERT INTO public.platform_balance (total_balance, reserved_balance, available_balance, currency)
VALUES (0, 0, 0, 'XOF')
ON CONFLICT DO NOTHING;

-- 3. Ajouter des colonnes à la table bookings pour l'escrow
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS escrow_status TEXT DEFAULT 'none' CHECK (escrow_status IN ('none', 'funds_held', 'transferred', 'refunded')),
ADD COLUMN IF NOT EXISTS confirmation_deadline TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS auto_refund_processed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS owner_confirmed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS transfer_scheduled_at TIMESTAMPTZ;

-- 4. Fonction pour valider les liens de paiement
CREATE OR REPLACE FUNCTION public.validate_payment_link(p_token TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_link_record RECORD;
BEGIN
  SELECT booking_id, expires_at, is_active, used_at
  INTO v_link_record
  FROM public.payment_links
  WHERE token = p_token;
  
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  
  IF NOT v_link_record.is_active 
     OR v_link_record.used_at IS NOT NULL 
     OR v_link_record.expires_at < NOW() THEN
    RETURN NULL;
  END IF;
  
  RETURN v_link_record.booking_id;
END;
$$;

-- 5. Fonction pour traiter les transactions d'escrow
CREATE OR REPLACE FUNCTION public.process_escrow_transaction(
  p_booking_id UUID,
  p_transaction_type TEXT,
  p_amount DECIMAL(10,2),
  p_cinetpay_transaction_id TEXT DEFAULT NULL,
  p_platform_fee DECIMAL(10,2) DEFAULT 0
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_transaction_id UUID;
  v_owner_amount DECIMAL(10,2);
BEGIN
  v_owner_amount := p_amount - p_platform_fee;
  
  INSERT INTO public.escrow_transactions (
    booking_id, transaction_type, amount, cinetpay_transaction_id,
    platform_fee, owner_amount, status
  ) VALUES (
    p_booking_id, p_transaction_type, p_amount, p_cinetpay_transaction_id,
    p_platform_fee, v_owner_amount, 'pending'
  ) RETURNING id INTO v_transaction_id;
  
  UPDATE public.bookings
  SET 
    escrow_status = CASE 
      WHEN p_transaction_type = 'payment_received' THEN 'funds_held'
      WHEN p_transaction_type = 'transfer_to_owner' THEN 'transferred'
      WHEN p_transaction_type = 'refund_to_customer' THEN 'refunded'
      ELSE escrow_status
    END,
    confirmation_deadline = CASE 
      WHEN p_transaction_type = 'payment_received' THEN NOW() + INTERVAL '24 hours'
      ELSE confirmation_deadline
    END,
    updated_at = NOW()
  WHERE id = p_booking_id;
  
  IF p_transaction_type = 'payment_received' THEN
    UPDATE public.platform_balance
    SET 
      total_balance = total_balance + p_amount,
      reserved_balance = reserved_balance + v_owner_amount,
      available_balance = available_balance + p_platform_fee,
      last_updated = NOW()
    WHERE currency = 'XOF';
  ELSIF p_transaction_type = 'transfer_to_owner' THEN
    UPDATE public.platform_balance
    SET reserved_balance = reserved_balance - v_owner_amount, last_updated = NOW()
    WHERE currency = 'XOF';
  ELSIF p_transaction_type = 'refund_to_customer' THEN
    UPDATE public.platform_balance
    SET 
      total_balance = total_balance - p_amount,
      reserved_balance = reserved_balance - v_owner_amount,
      available_balance = available_balance - p_platform_fee,
      last_updated = NOW()
    WHERE currency = 'XOF';
  END IF;
  
  RETURN v_transaction_id;
END;
$$;

-- 6. Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_escrow_transactions_booking_id ON public.escrow_transactions(booking_id);
CREATE INDEX IF NOT EXISTS idx_escrow_transactions_type_status ON public.escrow_transactions(transaction_type, status);
CREATE INDEX IF NOT EXISTS idx_bookings_escrow_status ON public.bookings(escrow_status);
CREATE INDEX IF NOT EXISTS idx_bookings_confirmation_deadline ON public.bookings(confirmation_deadline);

-- 7. RLS pour les nouvelles tables
ALTER TABLE public.escrow_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_balance ENABLE ROW LEVEL SECURITY;

-- Politiques RLS
CREATE POLICY "Users can view their own escrow transactions" ON public.escrow_transactions
  FOR SELECT USING (
    booking_id IN (SELECT id FROM public.bookings WHERE user_id = auth.uid())
  );

CREATE POLICY "Owners can view escrow transactions for their fields" ON public.escrow_transactions
  FOR SELECT USING (
    booking_id IN (
      SELECT b.id FROM public.bookings b
      JOIN public.fields f ON b.field_id = f.id
      WHERE f.owner_id = auth.uid()
    )
  );

CREATE POLICY "Only admins can view platform balance" ON public.platform_balance
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('super_admin', 'admin_general')
      AND is_active = true
    )
  );
