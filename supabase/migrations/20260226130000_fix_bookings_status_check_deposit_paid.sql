-- Fix: La contrainte bookings_status_check bloquait payment_status='deposit_paid'
-- Cette contrainte combinée (status + payment_status) n'incluait pas 'deposit_paid',
-- ce qui empêchait le webhook IPN de mettre à jour les réservations avec garantie.
-- Résultat: tous les bookings deposit restaient bloqués à pending/pending.

ALTER TABLE public.bookings DROP CONSTRAINT bookings_status_check;

ALTER TABLE public.bookings ADD CONSTRAINT bookings_status_check
CHECK (
  status IN ('provisional', 'pending', 'confirmed', 'cancelled', 'completed')
  AND payment_status IN ('pending', 'processing', 'paid', 'failed', 'deposit_paid')
);
