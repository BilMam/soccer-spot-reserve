-- Migration: Synchronisation automatique recurring_slots ↔ field_availability
-- Cette migration garantit que les recurring_slots bloquent automatiquement les field_availability correspondants

-- 1. Fonction de vérification des conflits recurring_slots
CREATE OR REPLACE FUNCTION public.check_recurring_slot_conflict(
  p_field_id UUID,
  p_date DATE,
  p_start_time TIME,
  p_end_time TIME
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  day_of_week_value INTEGER;
BEGIN
  day_of_week_value := EXTRACT(DOW FROM p_date);
  
  RETURN EXISTS (
    SELECT 1 FROM public.recurring_slots
    WHERE field_id = p_field_id
      AND is_active = true
      AND day_of_week = day_of_week_value
      AND p_date >= start_date
      AND (end_date IS NULL OR p_date <= end_date)
      AND (
        -- Chevauchement de créneaux horaires
        (start_time <= p_start_time AND end_time > p_start_time)
        OR (start_time < p_end_time AND end_time >= p_end_time)
        OR (start_time >= p_start_time AND end_time <= p_end_time)
      )
  );
END;
$$;

-- 2. Fonction de synchronisation automatique
CREATE OR REPLACE FUNCTION public.sync_field_availability_with_recurring_slots()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  affected_field_id UUID;
  affected_day_of_week INTEGER;
  affected_start_time TIME;
  affected_end_time TIME;
  affected_start_date DATE;
  affected_end_date DATE;
  slot_is_active BOOLEAN;
BEGIN
  -- Déterminer les valeurs selon l'opération (INSERT, UPDATE, DELETE)
  IF TG_OP = 'DELETE' THEN
    affected_field_id := OLD.field_id;
    affected_day_of_week := OLD.day_of_week;
    affected_start_time := OLD.start_time;
    affected_end_time := OLD.end_time;
    affected_start_date := OLD.start_date;
    affected_end_date := COALESCE(OLD.end_date, '2099-12-31'::DATE);
    slot_is_active := FALSE; -- Suppression = désactiver
  ELSE
    affected_field_id := NEW.field_id;
    affected_day_of_week := NEW.day_of_week;
    affected_start_time := NEW.start_time;
    affected_end_time := NEW.end_time;
    affected_start_date := NEW.start_date;
    affected_end_date := COALESCE(NEW.end_date, '2099-12-31'::DATE);
    slot_is_active := NEW.is_active;
  END IF;

  -- Mise à jour des field_availability correspondants
  IF slot_is_active THEN
    -- BLOQUER les créneaux (recurring_slot actif)
    UPDATE public.field_availability
    SET 
      is_available = false,
      unavailability_reason = 'Créneau récurrent',
      is_maintenance = true,
      updated_at = now()
    WHERE field_id = affected_field_id
      AND date BETWEEN affected_start_date AND affected_end_date
      AND EXTRACT(DOW FROM date) = affected_day_of_week
      AND start_time >= affected_start_time
      AND start_time < affected_end_time
      AND is_available = true;
  ELSE
    -- DÉBLOQUER les créneaux (recurring_slot inactif/supprimé)
    -- MAIS seulement si aucune réservation n'existe
    UPDATE public.field_availability fa
    SET 
      is_available = true,
      unavailability_reason = NULL,
      is_maintenance = false,
      updated_at = now()
    WHERE fa.field_id = affected_field_id
      AND fa.date BETWEEN affected_start_date AND affected_end_date
      AND EXTRACT(DOW FROM fa.date) = affected_day_of_week
      AND fa.start_time >= affected_start_time
      AND fa.start_time < affected_end_time
      AND fa.unavailability_reason = 'Créneau récurrent'
      -- Vérifier qu'il n'y a PAS de réservation confirmée sur ce créneau
      AND NOT EXISTS (
        SELECT 1 FROM public.bookings b
        WHERE b.field_id = fa.field_id
          AND b.booking_date = fa.date
          AND b.start_time = fa.start_time
          AND b.status IN ('confirmed', 'owner_confirmed', 'completed')
          AND b.payment_status = 'paid'
      );
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- 3. Création du trigger automatique
DROP TRIGGER IF EXISTS sync_recurring_slots_to_availability ON public.recurring_slots;

CREATE TRIGGER sync_recurring_slots_to_availability
  AFTER INSERT OR UPDATE OR DELETE ON public.recurring_slots
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_field_availability_with_recurring_slots();

-- 4. Fonction de resynchronisation manuelle (bonus)
CREATE OR REPLACE FUNCTION public.resync_all_recurring_slots(p_field_id UUID DEFAULT NULL)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  recurring_slot RECORD;
  updated_count INTEGER := 0;
  row_count_delta INTEGER;
BEGIN
  FOR recurring_slot IN 
    SELECT * FROM public.recurring_slots 
    WHERE (p_field_id IS NULL OR field_id = p_field_id)
      AND is_active = true
  LOOP
    -- Appliquer le blocage pour chaque recurring_slot actif
    UPDATE public.field_availability
    SET 
      is_available = false,
      unavailability_reason = 'Créneau récurrent',
      is_maintenance = true,
      updated_at = now()
    WHERE field_id = recurring_slot.field_id
      AND date BETWEEN recurring_slot.start_date AND COALESCE(recurring_slot.end_date, '2099-12-31'::DATE)
      AND EXTRACT(DOW FROM date) = recurring_slot.day_of_week
      AND start_time >= recurring_slot.start_time
      AND start_time < recurring_slot.end_time
      AND is_available = true;
      
    GET DIAGNOSTICS row_count_delta = ROW_COUNT;
    updated_count := updated_count + row_count_delta;
  END LOOP;
  
  RETURN updated_count;
END;
$$;