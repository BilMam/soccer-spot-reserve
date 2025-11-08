-- Phase 2: Supprimer la validation manuelle propriétaire et auto-confirmer les bookings

-- 1. Migrer les bookings existants de 'owner_confirmed' vers 'confirmed'
UPDATE public.bookings 
SET status = 'confirmed'
WHERE status = 'owner_confirmed';

-- 2. Supprimer la colonne owner_confirmed_at si elle existe
ALTER TABLE public.bookings 
DROP COLUMN IF EXISTS owner_confirmed_at;

-- 3. Créer un trigger pour auto-confirmer les bookings dès le paiement
CREATE OR REPLACE FUNCTION public.auto_confirm_booking()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Si payment_status passe à 'paid' et status est 'pending', confirmer automatiquement
  IF NEW.payment_status = 'paid' AND OLD.payment_status != 'paid' AND NEW.status = 'pending' THEN
    NEW.status := 'confirmed';
    RAISE LOG '[auto_confirm_booking] Booking % auto-confirmed (payment_status: % -> %)', 
      NEW.id, OLD.payment_status, NEW.payment_status;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Créer le trigger si pas déjà existant
DROP TRIGGER IF EXISTS trigger_auto_confirm_booking ON public.bookings;
CREATE TRIGGER trigger_auto_confirm_booking
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_confirm_booking();

-- 4. Bloquer automatiquement les créneaux quand un booking est confirmé
CREATE OR REPLACE FUNCTION public.block_slot_on_confirm()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Si le statut passe à 'confirmed' et payment_status est 'paid'
  IF NEW.status = 'confirmed' AND NEW.payment_status = 'paid' AND 
     (OLD.status IS NULL OR OLD.status != 'confirmed') THEN
    
    -- Marquer le créneau comme indisponible
    UPDATE public.field_availability
    SET is_available = false,
        updated_at = NOW()
    WHERE field_id = NEW.field_id
      AND date = NEW.booking_date
      AND start_time = NEW.start_time
      AND end_time = NEW.end_time;
    
    RAISE LOG '[block_slot_on_confirm] Slot blocked for booking %', NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Créer le trigger si pas déjà existant
DROP TRIGGER IF EXISTS trigger_block_slot_on_confirm ON public.bookings;
CREATE TRIGGER trigger_block_slot_on_confirm
  AFTER UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.block_slot_on_confirm();

-- 5. Commenter le changement
COMMENT ON FUNCTION public.auto_confirm_booking() IS 'Auto-confirme les bookings dès que payment_status passe à paid';
COMMENT ON FUNCTION public.block_slot_on_confirm() IS 'Bloque automatiquement les créneaux quand un booking est confirmé et payé';