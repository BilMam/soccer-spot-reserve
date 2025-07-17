
-- Vérifier la contrainte de statut actuelle et la mettre à jour si nécessaire
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_status_check;

-- Ajouter une contrainte qui inclut tous les statuts nécessaires
ALTER TABLE public.bookings ADD CONSTRAINT bookings_status_check 
CHECK (status IN ('pending', 'pending_approval', 'approved', 'confirmed', 'cancelled', 'completed', 'refunded', 'owner_confirmed'));

-- Commentaire pour clarifier les statuts
COMMENT ON COLUMN public.bookings.status IS 'pending, pending_approval, approved, confirmed, cancelled, completed, refunded, owner_confirmed';
