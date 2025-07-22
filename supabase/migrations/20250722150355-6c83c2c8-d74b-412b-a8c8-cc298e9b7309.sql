-- Corriger manuellement la réservation 19:30-20:30 qui a été payée
UPDATE public.bookings 
SET 
  status = 'confirmed',
  payment_status = 'paid',
  updated_at = now()
WHERE payment_intent_id = 'checkout_a5e5519e-6845-4d0e-a9ef-a6cb2defd95d_1753196305508';