-- Temporairement désactiver le trigger de validation pour nettoyer
ALTER TABLE public.bookings DISABLE TRIGGER ALL;

-- Nettoyer les anciennes réservations "pending" abandonnées 
UPDATE public.bookings 
SET 
  status = 'cancelled',
  payment_status = 'failed',
  cancellation_reason = 'Migration - nettoyage des anciennes tentatives',
  updated_at = now()
WHERE status = 'pending'
  AND payment_status = 'pending'
  AND created_at < now() - INTERVAL '1 hour';

-- Réactiver tous les triggers
ALTER TABLE public.bookings ENABLE TRIGGER ALL;