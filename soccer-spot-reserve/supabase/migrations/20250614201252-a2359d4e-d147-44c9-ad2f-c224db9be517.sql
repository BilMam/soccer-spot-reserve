
-- Améliorer la table bookings pour un système de réservation plus robuste
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS payment_intent_id TEXT,
ADD COLUMN IF NOT EXISTS confirmation_email_sent BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;

-- Mettre à jour les statuts possibles
COMMENT ON COLUMN public.bookings.status IS 'pending, confirmed, cancelled, completed';
COMMENT ON COLUMN public.bookings.payment_status IS 'pending, paid, failed, refunded';

-- Créer une table pour gérer les créneaux de disponibilité des terrains
CREATE TABLE IF NOT EXISTS public.field_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  field_id UUID NOT NULL REFERENCES public.fields(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_available BOOLEAN DEFAULT true,
  price_override NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(field_id, date, start_time, end_time)
);

-- Index pour optimiser les requêtes de disponibilité
CREATE INDEX IF NOT EXISTS idx_field_availability_date_field ON public.field_availability(field_id, date, is_available);

-- Activer RLS sur la nouvelle table
ALTER TABLE public.field_availability ENABLE ROW LEVEL SECURITY;

-- Politique pour voir les disponibilités (public)
CREATE POLICY "Anyone can view field availability" ON public.field_availability
  FOR SELECT USING (true);

-- Politique pour que les propriétaires puissent gérer leurs disponibilités
CREATE POLICY "Owners can manage their field availability" ON public.field_availability
  FOR ALL USING (
    field_id IN (
      SELECT id FROM public.fields WHERE owner_id = auth.uid()
    )
  );

-- Créer une table pour les notifications/emails
CREATE TABLE IF NOT EXISTS public.booking_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON COLUMN public.booking_notifications.notification_type IS 'booking_confirmation, payment_confirmation, booking_reminder, cancellation_notice';
COMMENT ON COLUMN public.booking_notifications.status IS 'pending, sent, failed';

-- Index pour optimiser les requêtes de notifications
CREATE INDEX IF NOT EXISTS idx_booking_notifications_booking_id ON public.booking_notifications(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_notifications_status ON public.booking_notifications(status);

-- Activer RLS sur les notifications
ALTER TABLE public.booking_notifications ENABLE ROW LEVEL SECURITY;

-- Politique pour voir ses propres notifications
CREATE POLICY "Users can view notifications for their bookings" ON public.booking_notifications
  FOR SELECT USING (
    booking_id IN (
      SELECT id FROM public.bookings WHERE user_id = auth.uid()
    )
    OR 
    booking_id IN (
      SELECT b.id FROM public.bookings b
      JOIN public.fields f ON b.field_id = f.id
      WHERE f.owner_id = auth.uid()
    )
  );

-- Fonction pour vérifier les conflits de réservation
CREATE OR REPLACE FUNCTION check_booking_conflict(
  p_field_id UUID,
  p_booking_date DATE,
  p_start_time TIME,
  p_end_time TIME,
  p_booking_id UUID DEFAULT NULL
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.bookings
    WHERE field_id = p_field_id
    AND booking_date = p_booking_date
    AND status IN ('pending', 'confirmed')
    AND (p_booking_id IS NULL OR id != p_booking_id)
    AND (
      (start_time <= p_start_time AND end_time > p_start_time)
      OR (start_time < p_end_time AND end_time >= p_end_time)
      OR (start_time >= p_start_time AND end_time <= p_end_time)
    )
  );
END;
$$ LANGUAGE plpgsql;

-- Trigger pour vérifier les conflits avant insertion/mise à jour
CREATE OR REPLACE FUNCTION validate_booking_conflict()
RETURNS TRIGGER AS $$
BEGIN
  IF check_booking_conflict(NEW.field_id, NEW.booking_date, NEW.start_time, NEW.end_time, NEW.id) THEN
    RAISE EXCEPTION 'Conflict detected: This time slot is already booked';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Ajouter le trigger si il n'existe pas déjà
DROP TRIGGER IF EXISTS booking_conflict_check ON public.bookings;
CREATE TRIGGER booking_conflict_check
  BEFORE INSERT OR UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION validate_booking_conflict();
