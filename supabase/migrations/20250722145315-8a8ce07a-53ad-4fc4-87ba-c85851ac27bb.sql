-- Corriger la réservation 18:30-19:30
UPDATE public.bookings 
SET 
  status = 'confirmed',
  payment_status = 'paid',
  updated_at = now()
WHERE id = '81151f1b-b450-43a9-b2f3-c67cc6bb5b68';