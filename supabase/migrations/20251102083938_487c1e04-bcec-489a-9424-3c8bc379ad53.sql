-- Correction fonction d'annulation : uniquement IN_PROGRESS (pas HOLD/CONFIRMED)
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
  v_rec RECORD;
  v_count integer := 0;
BEGIN
  FOR v_rec IN
    SELECT id, slot_start_time, slot_end_time
    FROM public.cagnotte
    WHERE field_id = p_field_id
      AND slot_date = p_date
      AND status = 'IN_PROGRESS'  -- 👈 UNIQUEMENT IN_PROGRESS
      AND slot_start_time < p_end_time 
      AND slot_end_time > p_start_time
    FOR UPDATE
  LOOP
    v_count := v_count + 1;

    -- Marquer la cagnotte comme annulée
    UPDATE public.cagnotte
    SET status = 'CANCELLED', updated_at = now()
    WHERE id = v_rec.id;

    -- Marquer les contributions à rembourser
    UPDATE public.cagnotte_contribution
    SET status = 'REFUND_PENDING', refund_initiated_at = now()
    WHERE cagnotte_id = v_rec.id AND status = 'SUCCEEDED';

    -- Si des remboursements à faire, passer en REFUNDING
    IF EXISTS(
      SELECT 1 FROM public.cagnotte_contribution
      WHERE cagnotte_id = v_rec.id AND status = 'REFUND_PENDING'
    ) THEN
      UPDATE public.cagnotte 
      SET status = 'REFUNDING', updated_at = now()
      WHERE id = v_rec.id;
    END IF;

    -- Libérer les HOLDs éventuels
    UPDATE public.field_availability
    SET on_hold_until = NULL, hold_cagnotte_id = NULL
    WHERE field_id = p_field_id
      AND date = p_date
      AND start_time >= v_rec.slot_start_time
      AND start_time < v_rec.slot_end_time;
  END LOOP;

  RETURN v_count;
END;
$$;

-- Trigger BEFORE INSERT pour annuler les IN_PROGRESS quand réservation confirmée+payée
CREATE OR REPLACE FUNCTION public.check_and_cancel_inprogress_on_booking()
RETURNS trigger 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public 
AS $$
DECLARE
  v_count integer;
BEGIN
  IF NEW.status IN ('confirmed','owner_confirmed') AND NEW.payment_status = 'paid' THEN
    SELECT public.cancel_conflicting_cagnottes_in_progress(
      NEW.field_id, 
      NEW.booking_date, 
      NEW.start_time, 
      NEW.end_time
    ) INTO v_count;
    
    IF v_count > 0 THEN
      RAISE NOTICE '% cagnotte(s) IN_PROGRESS annulée(s) pour booking %', v_count, NEW.id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cancel_inprogress_on_booking ON public.bookings;

CREATE TRIGGER trg_cancel_inprogress_on_booking
BEFORE INSERT ON public.bookings
FOR EACH ROW 
EXECUTE FUNCTION public.check_and_cancel_inprogress_on_booking();

-- Trigger BEFORE UPDATE pour annuler les IN_PROGRESS quand confirmation arrive après coup
CREATE OR REPLACE FUNCTION public.check_and_cancel_inprogress_on_booking_update()
RETURNS trigger 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public 
AS $$
DECLARE
  v_count integer;
  v_now_confirmed_paid boolean;
  v_was_confirmed_paid boolean;
BEGIN
  v_now_confirmed_paid := (
    NEW.status IN ('confirmed','owner_confirmed') 
    AND NEW.payment_status = 'paid'
  );
  
  v_was_confirmed_paid := (
    OLD.status IN ('confirmed','owner_confirmed') 
    AND OLD.payment_status = 'paid'
  );

  IF v_now_confirmed_paid AND NOT v_was_confirmed_paid THEN
    SELECT public.cancel_conflicting_cagnottes_in_progress(
      NEW.field_id, 
      NEW.booking_date, 
      NEW.start_time, 
      NEW.end_time
    ) INTO v_count;
    
    IF v_count > 0 THEN
      RAISE NOTICE '% cagnotte(s) IN_PROGRESS annulée(s) (UPDATE) pour booking %', v_count, NEW.id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cancel_inprogress_on_booking_update ON public.bookings;

CREATE TRIGGER trg_cancel_inprogress_on_booking_update
BEFORE UPDATE ON public.bookings
FOR EACH ROW 
WHEN (
  OLD.status IS DISTINCT FROM NEW.status 
  OR OLD.payment_status IS DISTINCT FROM NEW.payment_status
)
EXECUTE FUNCTION public.check_and_cancel_inprogress_on_booking_update();