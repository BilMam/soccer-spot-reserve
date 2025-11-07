-- Corriger cleanup_expired_cagnottes : supprimer updated_at de cagnotte_contribution
CREATE OR REPLACE FUNCTION public.cleanup_expired_cagnottes()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_released_count int := 0;
  v_cancelled_count int := 0;
  v_cagnotte_rec RECORD;
  v_contrib_count INTEGER;
BEGIN
  -- 1. Remettre les HOLD expirés en IN_PROGRESS (sans toucher hold_duration_sec)
  WITH released AS (
    UPDATE public.cagnotte
    SET 
      status = 'IN_PROGRESS',
      hold_started_at = NULL,
      hold_expires_at = NULL,
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
  
  -- 3. Annuler les cagnottes IN_PROGRESS expirées et initier les remboursements
  FOR v_cagnotte_rec IN (
    SELECT id FROM public.cagnotte
    WHERE status = 'IN_PROGRESS'
      AND expires_at < now()
  ) LOOP
    -- Compter les contributions réussies
    SELECT COUNT(*) INTO v_contrib_count
    FROM public.cagnotte_contribution
    WHERE cagnotte_id = v_cagnotte_rec.id
      AND status = 'SUCCEEDED';
    
    IF v_contrib_count = 0 THEN
      -- Pas de contributions à rembourser : marquer simplement la cagnotte EXPIRÉE
      UPDATE public.cagnotte
      SET 
        status = 'EXPIRED',
        cancellation_reason = 'Cagnotte expirée sans contribution réussie',
        updated_at = now()
      WHERE id = v_cagnotte_rec.id;
      
      RAISE NOTICE 'Cagnotte % expirée sans contribution', v_cagnotte_rec.id;
    ELSE
      -- Sinon, passer en REFUNDING et initier les remboursements
      UPDATE public.cagnotte
      SET 
        status = 'REFUNDING',
        cancellation_reason = 'Cagnotte expirée sans atteindre le seuil de HOLD',
        updated_at = now()
      WHERE id = v_cagnotte_rec.id;
      
      -- Correction : Supprimer updated_at de cagnotte_contribution
      UPDATE public.cagnotte_contribution
      SET 
        refund_status = 'PENDING',
        refund_initiated_at = now(),
        refund_attempt_count = 0,
        refund_last_error = NULL
      WHERE cagnotte_id = v_cagnotte_rec.id
        AND status = 'SUCCEEDED'
        AND (refund_status IS NULL OR refund_status = '' OR refund_status NOT IN ('PENDING', 'PROCESSING', 'REFUNDED'));
      
      RAISE NOTICE 'Cagnotte % en REFUNDING - % contributions à rembourser', v_cagnotte_rec.id, v_contrib_count;
    END IF;
    
    v_cancelled_count := v_cancelled_count + 1;
  END LOOP;
  
  RAISE NOTICE 'cleanup_expired_cagnottes: % HOLD libérés, % IN_PROGRESS expirées', 
    v_released_count, v_cancelled_count;
END;
$$;

-- Corriger cancel_conflicting_cagnottes_in_progress : supprimer updated_at
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
  v_cagnotte_rec record;
  v_count integer := 0;
  v_contrib_count INTEGER;
BEGIN
  FOR v_cagnotte_rec IN (
    SELECT id 
    FROM public.cagnotte
    WHERE field_id = p_field_id
      AND slot_date = p_date
      AND status = 'IN_PROGRESS'
      AND slot_start_time < p_end_time
      AND slot_end_time > p_start_time
  ) LOOP
    -- Compter les contributions réussies
    SELECT COUNT(*) INTO v_contrib_count
    FROM public.cagnotte_contribution
    WHERE cagnotte_id = v_cagnotte_rec.id
      AND status = 'SUCCEEDED';
    
    IF v_contrib_count = 0 THEN
      -- Pas de contributions à rembourser : annuler directement
      UPDATE public.cagnotte
      SET 
        status = 'CANCELLED',
        cancellation_reason = 'Réservation directe confirmée (aucune contribution)',
        updated_at = now()
      WHERE id = v_cagnotte_rec.id;
      
      RAISE NOTICE 'Cagnotte % annulée sans contribution', v_cagnotte_rec.id;
    ELSE
      -- Sinon, passer en REFUNDING et initier les remboursements
      UPDATE public.cagnotte
      SET 
        status = 'REFUNDING',
        cancellation_reason = 'Réservation directe confirmée',
        updated_at = now()
      WHERE id = v_cagnotte_rec.id;
      
      -- Correction : Supprimer updated_at de cagnotte_contribution
      UPDATE public.cagnotte_contribution
      SET 
        refund_status = 'PENDING',
        refund_initiated_at = now(),
        refund_attempt_count = 0,
        refund_last_error = NULL
      WHERE cagnotte_id = v_cagnotte_rec.id
        AND status = 'SUCCEEDED'
        AND (refund_status IS NULL OR refund_status = '' OR refund_status NOT IN ('PENDING', 'PROCESSING', 'REFUNDED'));
      
      RAISE NOTICE 'Cagnotte % en REFUNDING - % contributions à rembourser', v_cagnotte_rec.id, v_contrib_count;
    END IF;
    
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;