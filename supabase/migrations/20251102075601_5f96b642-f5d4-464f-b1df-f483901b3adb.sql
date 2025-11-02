-- Migration: Annulation automatique des cagnottes en conflit avec réservations confirmées
-- Objectif: Quand une réservation devient confirmée & payée, annuler automatiquement
-- toutes les cagnottes actives (IN_PROGRESS ou HOLD) qui chevauchent ce créneau

-- 1.1 — Statuts autorisés (check constraint)
ALTER TABLE public.cagnotte
  DROP CONSTRAINT IF EXISTS cagnotte_status_check;

ALTER TABLE public.cagnotte
  ADD CONSTRAINT cagnotte_status_check
  CHECK (status IN (
    'IN_PROGRESS','HOLD','CONFIRMED','EXPIRED',
    'CANCELLED','REFUNDING','REFUNDED'
  ));

-- 1.2 — Index pour performance (détection rapide des conflits)
-- Cherche vite les cagnottes actives par terrain/jour
CREATE INDEX IF NOT EXISTS idx_cagnotte_active_window
ON public.cagnotte (field_id, slot_date, slot_start_time, slot_end_time)
WHERE status IN ('IN_PROGRESS','HOLD');

-- Accélère la jointure temporelle côté bookings
CREATE INDEX IF NOT EXISTS idx_bookings_core
ON public.bookings (field_id, booking_date, start_time, end_time, status, payment_status);

-- 1.3 — Fonction d'annulation des cagnottes en conflit
-- Idempotence: si déjà annulée, aucun effet
-- Concurrence: verrou doux via FOR UPDATE sur les cagnottes ciblées
-- Rembourse uniquement les contributions SUCCEEDED
CREATE OR REPLACE FUNCTION public.cancel_conflicting_cagnottes(
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
  v_cancelled_count integer := 0;
BEGIN
  FOR v_rec IN
    SELECT id, slot_start_time, slot_end_time, status
    FROM public.cagnotte
    WHERE field_id = p_field_id
      AND slot_date = p_date
      AND status IN ('IN_PROGRESS','HOLD')
      AND (slot_start_time < p_end_time AND slot_end_time > p_start_time)
    FOR UPDATE
  LOOP
    -- Si déjà traitée par une autre transaction concurrente, passe
    IF v_rec.status NOT IN ('IN_PROGRESS','HOLD') THEN
      CONTINUE;
    END IF;

    -- Basculer en CANCELLED si pas de contribution réussie, sinon REFUNDING
    IF EXISTS (
      SELECT 1
      FROM public.cagnotte_contribution
      WHERE cagnotte_id = v_rec.id
        AND status = 'SUCCEEDED'
    ) THEN
      UPDATE public.cagnotte
      SET status = 'REFUNDING', updated_at = now()
      WHERE id = v_rec.id;
      -- Marquer les contributions à rembourser
      UPDATE public.cagnotte_contribution
      SET status = 'REFUND_PENDING', refund_initiated_at = now()
      WHERE cagnotte_id = v_rec.id AND status = 'SUCCEEDED';
    ELSE
      UPDATE public.cagnotte
      SET status = 'CANCELLED', updated_at = now()
      WHERE id = v_rec.id;
    END IF;

    -- Libérer d'éventuels HOLDs côté disponibilités
    UPDATE public.field_availability
    SET on_hold_until = NULL, hold_cagnotte_id = NULL
    WHERE field_id = p_field_id
      AND date = p_date
      AND start_time >= v_rec.slot_start_time
      AND start_time <  v_rec.slot_end_time;

    v_cancelled_count := v_cancelled_count + 1;
  END LOOP;

  RETURN v_cancelled_count;
END;
$$;

-- 1.4 — Trigger sur bookings (INSERT et UPDATE)
-- Déclenche avant insertion ou mise à jour quand le couple (status, payment_status) 
-- passe à confirmé & payé
-- Couvre les deux flux : insertion directe confirmée/payée ou réservation d'abord 
-- "pending" puis confirmée/payée par update
CREATE OR REPLACE FUNCTION public.check_and_cancel_cagnottes_on_booking()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cancelled_count integer;
  v_now_confirmed_paid boolean := (
    NEW.status IN ('confirmed','owner_confirmed')
    AND NEW.payment_status = 'paid'
  );
  v_was_confirmed_paid boolean := (
    TG_OP = 'UPDATE'
    AND COALESCE(OLD.status, '') IN ('confirmed','owner_confirmed')
    AND COALESCE(OLD.payment_status,'') = 'paid'
  );
BEGIN
  -- Exécuter seulement quand on (re)devient confirmé & payé
  IF v_now_confirmed_paid AND NOT v_was_confirmed_paid THEN
    SELECT public.cancel_conflicting_cagnottes(
      NEW.field_id, NEW.booking_date, NEW.start_time, NEW.end_time
    ) INTO v_cancelled_count;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cancel_cagnottes_on_booking ON public.bookings;

CREATE TRIGGER trg_cancel_cagnottes_on_booking
BEFORE INSERT OR UPDATE ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.check_and_cancel_cagnottes_on_booking();