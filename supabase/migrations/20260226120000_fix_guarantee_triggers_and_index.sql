-- Fix: Les triggers auto_confirm_booking et block_slot_on_confirm ignorent 'deposit_paid'
-- Fix: L'index unique_confirmed_booking_slot ne protège pas contre le double-booking avec garantie
-- Ces bugs cassent tout le flux post-paiement pour les réservations avec garantie.

-- ============================================================
-- 1. Corriger auto_confirm_booking() pour accepter 'deposit_paid'
-- ============================================================
CREATE OR REPLACE FUNCTION public.auto_confirm_booking()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Si payment_status passe à 'paid' OU 'deposit_paid' et status est 'pending', confirmer automatiquement
  IF (NEW.payment_status = 'paid' OR NEW.payment_status = 'deposit_paid')
     AND OLD.payment_status NOT IN ('paid', 'deposit_paid')
     AND NEW.status = 'pending' THEN
    NEW.status := 'confirmed';
    RAISE LOG '[auto_confirm_booking] Booking % auto-confirmed (payment_status: % -> %)',
      NEW.id, OLD.payment_status, NEW.payment_status;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.auto_confirm_booking() IS 'Auto-confirme les bookings dès que payment_status passe à paid ou deposit_paid';

-- ============================================================
-- 2. Corriger block_slot_on_confirm() pour accepter 'deposit_paid'
-- ============================================================
CREATE OR REPLACE FUNCTION public.block_slot_on_confirm()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Si le statut passe à 'confirmed' et payment_status est 'paid' OU 'deposit_paid'
  IF NEW.status = 'confirmed'
     AND (NEW.payment_status = 'paid' OR NEW.payment_status = 'deposit_paid')
     AND (OLD.status IS NULL OR OLD.status != 'confirmed') THEN

    -- Marquer le créneau comme indisponible
    UPDATE public.field_availability
    SET is_available = false,
        updated_at = NOW()
    WHERE field_id = NEW.field_id
      AND date = NEW.booking_date
      AND start_time = NEW.start_time
      AND end_time = NEW.end_time;

    RAISE LOG '[block_slot_on_confirm] Slot blocked for booking % (payment_status: %)', NEW.id, NEW.payment_status;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.block_slot_on_confirm() IS 'Bloque automatiquement les créneaux quand un booking est confirmé et payé (full ou deposit)';

-- ============================================================
-- 3. Corriger l'index unique pour protéger contre le double-booking avec garantie
-- ============================================================
DROP INDEX IF EXISTS unique_confirmed_booking_slot;

CREATE UNIQUE INDEX unique_confirmed_booking_slot
ON public.bookings USING btree (field_id, booking_date, start_time, end_time)
WHERE (
  status IN ('confirmed', 'owner_confirmed', 'completed')
  AND payment_status IN ('paid', 'deposit_paid')
);
