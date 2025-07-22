-- Supprimer directement les anciennes réservations "pending" abandonnées
DELETE FROM public.bookings 
WHERE status = 'pending'
  AND payment_status = 'pending'
  AND created_at < now() - INTERVAL '1 hour';