
-- Améliorer la fonction set_slots_unavailable pour vérifier les conflits avec les réservations
CREATE OR REPLACE FUNCTION public.set_slots_unavailable(
  p_field_id UUID,
  p_date DATE,
  p_start_time TIME,
  p_end_time TIME,
  p_reason TEXT DEFAULT 'Maintenance',
  p_notes TEXT DEFAULT NULL
) RETURNS INTEGER AS $$
DECLARE
  affected_count INTEGER;
  booking_conflict_count INTEGER;
BEGIN
  -- Vérifier s'il y a des réservations actives dans cette plage horaire
  SELECT COUNT(*) INTO booking_conflict_count
  FROM public.bookings
  WHERE field_id = p_field_id
    AND booking_date = p_date
    AND status IN ('pending', 'confirmed', 'owner_confirmed')
    AND (
      (start_time <= p_start_time AND end_time > p_start_time)
      OR (start_time < p_end_time AND end_time >= p_end_time)
      OR (start_time >= p_start_time AND end_time <= p_end_time)
    );
  
  -- Si des réservations existent, lever une exception
  IF booking_conflict_count > 0 THEN
    RAISE EXCEPTION 'Cannot mark slots unavailable: % active booking(s) found in this time period', booking_conflict_count;
  END IF;

  -- Procéder avec la mise à jour si aucun conflit
  UPDATE public.field_availability
  SET 
    is_available = false,
    unavailability_reason = p_reason,
    notes = p_notes,
    is_maintenance = true,
    updated_at = now()
  WHERE field_id = p_field_id
    AND date = p_date
    AND start_time >= p_start_time
    AND end_time <= p_end_time;
  
  GET DIAGNOSTICS affected_count = ROW_COUNT;
  RETURN affected_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Créer une fonction pour vérifier si un créneau spécifique est réservé
CREATE OR REPLACE FUNCTION public.check_slot_booking_status(
  p_field_id UUID,
  p_date DATE,
  p_start_time TIME,
  p_end_time TIME
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.bookings
    WHERE field_id = p_field_id
      AND booking_date = p_date
      AND status IN ('pending', 'confirmed', 'owner_confirmed')
      AND start_time = p_start_time
      AND end_time = p_end_time
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
