-- Mise à jour de cancel_conflicting_cagnottes_in_progress pour enregistrer la raison d'annulation
CREATE OR REPLACE FUNCTION public.cancel_conflicting_cagnottes_in_progress(
  p_field_id uuid, 
  p_date date, 
  p_start_time time, 
  p_end_time time
) RETURNS integer
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public 
AS $$
DECLARE
  v_rec record;
  v_count integer := 0;
BEGIN
  FOR v_rec IN (
    SELECT id 
    FROM public.cagnotte
    WHERE field_id = p_field_id
      AND slot_date = p_date
      AND status = 'IN_PROGRESS'
      AND slot_start_time < p_end_time
      AND slot_end_time > p_start_time
  ) LOOP
    -- Marquer la cagnotte comme annulée avec la raison
    UPDATE public.cagnotte
    SET status = 'CANCELLED',
        cancellation_reason = 'Réservation directe confirmée',
        updated_at = now()
    WHERE id = v_rec.id;
    
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;