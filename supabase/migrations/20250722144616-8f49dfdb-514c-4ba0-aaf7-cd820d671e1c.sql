-- Corriger manuellement la réservation 17:30-18:30
UPDATE public.bookings 
SET 
  status = 'confirmed',
  payment_status = 'paid',
  updated_at = now()
WHERE id = 'd0bd4217-6d24-4460-adf0-989a65117c07';