-- Recréer la fonction de validation des créneaux avec search_path
CREATE OR REPLACE FUNCTION public.validate_booking_slot_exists(
  p_field_id UUID,
  p_date DATE,
  p_start_time TIME
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  slot_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM public.field_availability
    WHERE field_id = p_field_id
      AND date = p_date
      AND start_time = p_start_time
      AND is_available = true
  )
  INTO slot_exists;

  RETURN slot_exists;
END;
$$;

-- Recréer la fonction trigger
CREATE OR REPLACE FUNCTION public.check_booking_slot_exists()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.validate_booking_slot_exists(
    NEW.field_id,
    NEW.booking_date,
    NEW.start_time
  ) THEN
    RAISE EXCEPTION
      'Créneau indisponible pour ce terrain à cette heure (%).',
      NEW.start_time;
  END IF;

  RETURN NEW;
END;
$$;

-- S'assurer que le trigger est bien installé
DROP TRIGGER IF EXISTS booking_slot_exists_check ON public.bookings;

CREATE TRIGGER booking_slot_exists_check
BEFORE INSERT ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.check_booking_slot_exists();