-- Nettoyer les anciennes réservations "pending" abandonnées (ancien système)
UPDATE public.bookings 
SET 
  status = 'cancelled',
  payment_status = 'failed',
  cancellation_reason = 'Migration - nettoyage des anciennes tentatives',
  updated_at = now()
WHERE status = 'pending'
  AND payment_status = 'pending'
  AND created_at < now() - INTERVAL '1 hour';