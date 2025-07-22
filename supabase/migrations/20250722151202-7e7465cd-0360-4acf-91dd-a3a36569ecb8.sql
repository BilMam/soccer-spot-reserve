-- Corriger la réservation 20:30-21:30 qui a été payée
UPDATE public.bookings 
SET 
  status = 'confirmed',
  payment_status = 'paid',
  updated_at = now()
WHERE payment_intent_id = 'checkout_ab5c4dd2-06bc-4465-824a-ba8034ee77b7_1753196830129';