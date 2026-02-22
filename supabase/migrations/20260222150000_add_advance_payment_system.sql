-- ============================================================================
-- Migration: Système de paiement d'avance (partiel)
--
-- Permet aux propriétaires de terrains d'accepter un paiement partiel (avance)
-- lors de la réservation, avec le solde payé sur place le jour du match.
-- ============================================================================

-- 1. Ajouter les colonnes d'avance sur la table fields
ALTER TABLE public.fields
  ADD COLUMN IF NOT EXISTS advance_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS advance_percentage INTEGER DEFAULT 100
    CHECK (advance_percentage >= 10 AND advance_percentage <= 100);

-- Commenter les colonnes pour documentation
COMMENT ON COLUMN public.fields.advance_enabled IS 'Si true, le terrain accepte les paiements partiels (avance)';
COMMENT ON COLUMN public.fields.advance_percentage IS 'Pourcentage du prix public requis comme avance (10-100). 100 = paiement intégral';

-- 2. Ajouter les colonnes de paiement partiel sur la table bookings
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS payment_type TEXT DEFAULT 'full'
    CHECK (payment_type IN ('full', 'advance')),
  ADD COLUMN IF NOT EXISTS advance_amount DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS remaining_amount DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS remaining_payment_status TEXT DEFAULT 'not_applicable'
    CHECK (remaining_payment_status IN ('not_applicable', 'pending', 'paid_on_site', 'waived')),
  ADD COLUMN IF NOT EXISTS remaining_paid_at TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN public.bookings.payment_type IS 'Type de paiement: full = intégral, advance = avance partielle';
COMMENT ON COLUMN public.bookings.advance_amount IS 'Montant payé en avance via la plateforme';
COMMENT ON COLUMN public.bookings.remaining_amount IS 'Montant restant à payer sur place';
COMMENT ON COLUMN public.bookings.remaining_payment_status IS 'Statut du paiement restant: not_applicable, pending, paid_on_site, waived';
COMMENT ON COLUMN public.bookings.remaining_paid_at IS 'Date de confirmation du paiement restant';

-- 3. Fonction RPC pour que le propriétaire confirme le paiement restant
CREATE OR REPLACE FUNCTION public.confirm_remaining_payment(
  p_booking_id UUID,
  p_status TEXT DEFAULT 'paid_on_site'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking RECORD;
  v_field RECORD;
BEGIN
  -- Vérifier que le statut est valide
  IF p_status NOT IN ('paid_on_site', 'waived') THEN
    RAISE EXCEPTION 'Statut invalide: %', p_status;
  END IF;

  -- Récupérer la réservation
  SELECT b.*, f.owner_id
  INTO v_booking
  FROM bookings b
  JOIN fields f ON f.id = b.field_id
  WHERE b.id = p_booking_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Réservation introuvable';
  END IF;

  -- Vérifier que l'appelant est le propriétaire du terrain
  IF v_booking.owner_id != auth.uid() THEN
    RAISE EXCEPTION 'Seul le propriétaire du terrain peut confirmer le paiement restant';
  END IF;

  -- Vérifier que c'est un paiement partiel avec un solde en attente
  IF v_booking.payment_type != 'advance' THEN
    RAISE EXCEPTION 'Cette réservation n''est pas un paiement partiel';
  END IF;

  IF v_booking.remaining_payment_status NOT IN ('pending') THEN
    RAISE EXCEPTION 'Le paiement restant a déjà été traité (statut: %)', v_booking.remaining_payment_status;
  END IF;

  -- Mettre à jour le statut du paiement restant
  UPDATE bookings
  SET
    remaining_payment_status = p_status,
    remaining_paid_at = NOW(),
    status = 'completed',
    updated_at = NOW()
  WHERE id = p_booking_id;

  RETURN json_build_object(
    'success', true,
    'booking_id', p_booking_id,
    'remaining_status', p_status,
    'message', CASE
      WHEN p_status = 'paid_on_site' THEN 'Paiement restant confirmé'
      WHEN p_status = 'waived' THEN 'Paiement restant annulé (offert)'
    END
  );
END;
$$;

-- 4. Index pour requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_bookings_payment_type ON public.bookings(payment_type);
CREATE INDEX IF NOT EXISTS idx_bookings_remaining_status ON public.bookings(remaining_payment_status) WHERE payment_type = 'advance';
CREATE INDEX IF NOT EXISTS idx_fields_advance_enabled ON public.fields(advance_enabled) WHERE advance_enabled = true;
