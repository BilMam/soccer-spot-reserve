-- Migration: Ajouter les colonnes de garantie à la table bookings
-- Feature: Garantie Terrain Bloqué (paiement en 2 temps)

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS payment_type text DEFAULT 'full'
    CHECK (payment_type IN ('full', 'deposit')),
  ADD COLUMN IF NOT EXISTS deposit_amount numeric(10,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS deposit_public_price numeric(10,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS balance_due numeric(10,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS deposit_paid boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS balance_paid boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS guarantee_commission_rate numeric(4,2) DEFAULT NULL;

-- Permettre le statut 'deposit_paid' dans payment_status
-- D'abord vérifier si la contrainte existe et la modifier
DO $$
BEGIN
  -- Supprimer l'ancienne contrainte si elle existe
  IF EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'bookings_payment_status_check'
  ) THEN
    ALTER TABLE public.bookings DROP CONSTRAINT bookings_payment_status_check;
  END IF;

  -- Ajouter la nouvelle contrainte avec 'deposit_paid'
  ALTER TABLE public.bookings ADD CONSTRAINT bookings_payment_status_check
    CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded', 'deposit_paid'));
EXCEPTION
  WHEN others THEN
    -- Si la contrainte n'existait pas ou autre erreur, on continue silencieusement
    RAISE NOTICE 'Constraint update skipped: %', SQLERRM;
END $$;
