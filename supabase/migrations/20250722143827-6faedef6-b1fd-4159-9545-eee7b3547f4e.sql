-- Corriger manuellement la réservation 16:30-17:30 qui n'a pas été traitée par le webhook
UPDATE public.bookings 
SET 
  status = 'confirmed',
  payment_status = 'paid',
  updated_at = now()
WHERE id = '4fe07c5f-f8d6-46ea-b3fc-e9331d8b9bfe';