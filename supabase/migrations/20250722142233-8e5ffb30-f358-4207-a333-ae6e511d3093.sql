-- Première étape: nettoyer les données existantes avant de changer la contrainte

-- Mettre à jour toutes les réservations vers les nouveaux statuts
UPDATE public.bookings 
SET 
  status = CASE 
    WHEN status IN ('pending', 'approved') THEN 'provisional'
    WHEN status = 'confirmed' THEN 'confirmed'
    WHEN status = 'cancelled' THEN 'cancelled'
    WHEN status = 'completed' THEN 'completed'
    ELSE 'provisional'  -- fallback pour tout autre statut
  END,
  updated_at = now();

-- Deuxième étape: supprimer l'ancienne contrainte
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_status_check;

-- Troisième étape: créer la nouvelle contrainte avec les statuts du nouveau workflow
ALTER TABLE public.bookings ADD CONSTRAINT bookings_status_check 
CHECK (status = ANY (ARRAY['provisional'::text, 'confirmed'::text, 'cancelled'::text, 'completed'::text]));

-- Quatrième étape: corriger spécifiquement la réservation de l'utilisateur qui vient de payer
UPDATE public.bookings 
SET 
  status = 'confirmed', 
  payment_status = 'paid',
  updated_at = now()
WHERE id = '916590cb-4b4a-4c7e-b172-ba4b3dae7cb0';