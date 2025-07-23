-- D'abord, supprimer l'ancienne contrainte
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_status_check;

-- Ajouter la colonne paid_at si elle n'existe pas
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP WITH TIME ZONE;

-- Mettre à jour les lignes existantes pour qu'elles respectent la nouvelle contrainte
UPDATE public.bookings 
SET 
  status = CASE 
    WHEN status = 'owner_confirmed' THEN 'confirmed'
    WHEN status = 'refunded' THEN 'cancelled'
    WHEN status NOT IN ('provisional', 'pending', 'confirmed', 'cancelled', 'completed') THEN 'cancelled'
    ELSE status
  END,
  payment_status = CASE 
    WHEN payment_status = 'expired' THEN 'failed'
    WHEN payment_status NOT IN ('pending', 'processing', 'paid', 'failed') THEN 'failed'
    ELSE payment_status
  END,
  updated_at = now()
WHERE status NOT IN ('provisional', 'pending', 'confirmed', 'cancelled', 'completed')
   OR payment_status NOT IN ('pending', 'processing', 'paid', 'failed');

-- Maintenant ajouter la nouvelle contrainte
ALTER TABLE public.bookings ADD CONSTRAINT bookings_status_check 
CHECK (
  status IN ('provisional', 'pending', 'confirmed', 'cancelled', 'completed') 
  AND payment_status IN ('pending', 'processing', 'paid', 'failed')
);

-- Commentaire pour clarifier les statuts autorisés
COMMENT ON COLUMN public.bookings.status IS 'provisional, pending, confirmed, cancelled, completed';
COMMENT ON COLUMN public.bookings.payment_status IS 'pending, processing, paid, failed';