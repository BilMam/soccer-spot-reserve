-- Fonction de validation de créneau avant création de réservation
-- Cette fonction vérifie qu'un créneau existe et est disponible avant de permettre une réservation

CREATE OR REPLACE FUNCTION public.validate_booking_slot_exists(
  p_field_id UUID,
  p_date DATE,
  p_start_time TIME,
  p_end_time TIME
)
RETURNS BOOLEAN AS $$
DECLARE
  slot_exists BOOLEAN;
BEGIN
  -- Vérifier qu'il existe au moins un créneau disponible qui couvre l'heure de début demandée
  SELECT EXISTS (
    SELECT 1
    FROM public.field_availability
    WHERE field_id = p_field_id
      AND date = p_date
      AND start_time = p_start_time
      AND is_available = true
  ) INTO slot_exists;

  RETURN slot_exists;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger pour valider l'existence du créneau avant insertion d'une réservation
CREATE OR REPLACE FUNCTION public.check_booking_slot_exists()
RETURNS TRIGGER AS $$
BEGIN
  -- Vérifier que le créneau existe et est disponible
  IF NOT public.validate_booking_slot_exists(
    NEW.field_id,
    NEW.booking_date,
    NEW.start_time,
    NEW.end_time
  ) THEN
    RAISE EXCEPTION 'Créneau indisponible pour ce terrain à cette heure. Le créneau demandé (%) n''existe pas ou n''est pas disponible.', 
      NEW.start_time;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer le trigger sur la table bookings (seulement si pas déjà existant)
DROP TRIGGER IF EXISTS booking_slot_exists_check ON public.bookings;
CREATE TRIGGER booking_slot_exists_check
  BEFORE INSERT ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.check_booking_slot_exists();