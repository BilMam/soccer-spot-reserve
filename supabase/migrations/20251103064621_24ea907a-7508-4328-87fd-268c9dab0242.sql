-- Migration: Corrections et améliorations du système de remboursement automatique
-- 1. Ajouter la colonne refund_initiated_at manquante
ALTER TABLE public.cagnotte_contribution
ADD COLUMN IF NOT EXISTS refund_initiated_at TIMESTAMPTZ;

COMMENT ON COLUMN public.cagnotte_contribution.refund_initiated_at IS 'Date de mise en attente du remboursement (passage en PENDING)';

-- 2. Mettre à jour cleanup_expired_cagnottes pour horodater refund_initiated_at
CREATE OR REPLACE FUNCTION public.cleanup_expired_cagnottes()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_released_count int := 0;
  v_cancelled_count int := 0;
  v_cagnotte_rec RECORD;
  v_has_contributions BOOLEAN;
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
    -- Vérifier s'il y a des contributions à rembourser
    SELECT EXISTS(
      SELECT 1 FROM public.cagnotte_contribution
      WHERE cagnotte_id = v_cagnotte_rec.id
        AND status = 'SUCCEEDED'
    ) INTO v_has_contributions;
    
    -- Marquer toutes les contributions réussies comme PENDING avec horodatage
    UPDATE public.cagnotte_contribution
    SET 
      refund_status = 'PENDING',
      refund_initiated_at = now(),
      updated_at = now()
    WHERE cagnotte_id = v_cagnotte_rec.id
      AND status = 'SUCCEEDED'
      AND (refund_status IS NULL OR refund_status = '' OR refund_status NOT IN ('PENDING', 'PROCESSING', 'REFUNDED'));
    
    -- Passer la cagnotte en REFUNDING seulement si des contributions existent
    IF v_has_contributions THEN
      UPDATE public.cagnotte
      SET 
        status = 'REFUNDING',
        cancellation_reason = 'Cagnotte expirée sans atteindre le seuil de HOLD',
        updated_at = now()
      WHERE id = v_cagnotte_rec.id;
    ELSE
      -- Sinon, passer directement en EXPIRED
      UPDATE public.cagnotte
      SET 
        status = 'EXPIRED',
        cancellation_reason = 'Cagnotte expirée sans contributions',
        updated_at = now()
      WHERE id = v_cagnotte_rec.id;
    END IF;
    
    v_cancelled_count := v_cancelled_count + 1;
  END LOOP;
  
  RAISE NOTICE 'cleanup_expired_cagnottes: % HOLD libérés, % IN_PROGRESS expirées → REFUNDING/EXPIRED', 
    v_released_count, v_cancelled_count;
END;
$$;

-- 3. Mettre à jour cancel_conflicting_cagnottes_in_progress pour horodater refund_initiated_at
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
  v_has_contributions BOOLEAN;
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
    -- Vérifier s'il y a des contributions à rembourser
    SELECT EXISTS(
      SELECT 1 FROM public.cagnotte_contribution
      WHERE cagnotte_id = v_cagnotte_rec.id
        AND status = 'SUCCEEDED'
    ) INTO v_has_contributions;
    
    -- Marquer toutes les contributions réussies comme PENDING avec horodatage
    UPDATE public.cagnotte_contribution
    SET 
      refund_status = 'PENDING',
      refund_initiated_at = now(),
      updated_at = now()
    WHERE cagnotte_id = v_cagnotte_rec.id
      AND status = 'SUCCEEDED'
      AND (refund_status IS NULL OR refund_status = '' OR refund_status NOT IN ('PENDING', 'PROCESSING', 'REFUNDED'));
    
    -- Passer en REFUNDING avec raison seulement si des contributions existent
    IF v_has_contributions THEN
      UPDATE public.cagnotte
      SET 
        status = 'REFUNDING',
        cancellation_reason = 'Réservation directe confirmée',
        updated_at = now()
      WHERE id = v_cagnotte_rec.id;
    ELSE
      -- Sinon, passer directement en CANCELLED
      UPDATE public.cagnotte
      SET 
        status = 'CANCELLED',
        cancellation_reason = 'Réservation directe confirmée (aucune contribution)',
        updated_at = now()
      WHERE id = v_cagnotte_rec.id;
    END IF;
    
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;