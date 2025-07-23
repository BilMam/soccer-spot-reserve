-- Étendre la contrainte CHECK pour autoriser les statuts définitifs
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_status_check;

-- Ajouter la nouvelle contrainte avec tous les statuts nécessaires
ALTER TABLE public.bookings ADD CONSTRAINT bookings_status_check 
CHECK (
  status IN ('provisional', 'pending', 'confirmed', 'cancelled', 'completed') 
  AND payment_status IN ('pending', 'processing', 'paid', 'failed')
);

-- Ajouter la colonne paid_at si elle n'existe pas
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP WITH TIME ZONE;

-- Commentaire pour clarifier les statuts autorisés
COMMENT ON COLUMN public.bookings.status IS 'provisional, pending, confirmed, cancelled, completed';
COMMENT ON COLUMN public.bookings.payment_status IS 'pending, processing, paid, failed';