-- Suppression et recréation de cleanup_expired_cagnottes pour préserver hold_duration_sec
DROP FUNCTION IF EXISTS public.cleanup_expired_cagnottes();

CREATE OR REPLACE FUNCTION public.cleanup_expired_cagnottes()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_released_count int := 0;
  v_cancelled_count int := 0;
BEGIN
  -- 1. Remettre les HOLD expirés en IN_PROGRESS (sans toucher hold_duration_sec)
  WITH released AS (
    UPDATE public.cagnotte
    SET 
      status = 'IN_PROGRESS',
      hold_started_at = NULL,
      hold_expires_at = NULL,
      -- On conserve hold_duration_sec pour garder l'historique du dernier HOLD
      updated_at = now()
    WHERE status = 'HOLD'
      AND hold_expires_at < now()
    RETURNING id
  )
  SELECT COUNT(*) INTO v_released_count FROM released;
  
  -- 2. Libérer les créneaux du HOLD expiré
  UPDATE public.field_availability
  SET 
    on_hold_until = NULL,
    hold_cagnotte_id = NULL
  WHERE hold_cagnotte_id IN (
    SELECT id FROM public.cagnotte
    WHERE status = 'IN_PROGRESS'
      AND hold_expires_at IS NULL
      AND hold_started_at IS NULL
  );
  
  -- 3. Annuler les cagnottes IN_PROGRESS expirées
  WITH cancelled AS (
    UPDATE public.cagnotte
    SET 
      status = 'CANCELLED',
      cancellation_reason = 'Cagnotte expirée sans atteindre le seuil de HOLD',
      updated_at = now()
    WHERE status = 'IN_PROGRESS'
      AND expires_at < now()
    RETURNING id
  )
  SELECT COUNT(*) INTO v_cancelled_count FROM cancelled;
  
  RAISE NOTICE 'cleanup_expired_cagnottes: % HOLD libérés, % IN_PROGRESS annulés', 
    v_released_count, v_cancelled_count;
END;
$$;

-- Suppression de la fonction obsolète cancel_conflicting_cagnottes et ses triggers
DROP TRIGGER IF EXISTS trg_cancel_cagnottes_on_booking ON public.bookings;
DROP TRIGGER IF EXISTS check_and_cancel_cagnottes_on_booking ON public.bookings;
DROP FUNCTION IF EXISTS public.cancel_conflicting_cagnottes(uuid, date, time, time);