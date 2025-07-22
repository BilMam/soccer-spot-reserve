-- Correction de la contrainte CHECK pour inclure le statut 'provisional'
-- et supprimer les anciens statuts obsolètes

-- Supprimer l'ancienne contrainte
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_status_check;

-- Créer la nouvelle contrainte avec les statuts du nouveau workflow
ALTER TABLE public.bookings ADD CONSTRAINT bookings_status_check 
CHECK (status = ANY (ARRAY['provisional'::text, 'confirmed'::text, 'cancelled'::text, 'completed'::text]));

-- Mettre à jour toutes les réservations existantes vers le nouveau workflow
UPDATE public.bookings 
SET 
  status = CASE 
    WHEN status IN ('pending', 'pending_approval', 'approved') THEN 'provisional'
    WHEN status IN ('confirmed', 'owner_confirmed') THEN 'confirmed'
    WHEN status IN ('cancelled', 'refunded') THEN 'cancelled'
    WHEN status = 'completed' THEN 'completed'
    ELSE 'cancelled'
  END,
  updated_at = now()
WHERE status NOT IN ('provisional', 'confirmed', 'cancelled', 'completed');

-- Corriger spécifiquement la réservation de l'utilisateur qui vient de payer
UPDATE public.bookings 
SET 
  status = 'confirmed', 
  payment_status = 'paid',
  updated_at = now()
WHERE id = '916590cb-4b4a-4c7e-b172-ba4b3dae7cb0';