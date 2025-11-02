-- Corriger cleanup_expired_cagnottes pour préserver hold_duration_sec
-- IMPORTANT: Ne pas mettre hold_duration_sec à NULL pour garder l'historique du timer
CREATE OR REPLACE FUNCTION public.cleanup_expired_cagnottes()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_expired_cagnottes record;
  v_expired_count integer := 0;
  v_hold_released_count integer := 0;
BEGIN
  -- 1. Gérer les HOLDs expirés qui doivent RETOURNER en IN_PROGRESS
  FOR v_expired_cagnottes IN
    SELECT *
    FROM public.cagnotte
    WHERE status = 'HOLD'
      AND now() > hold_expires_at
      AND collected_amount < total_amount
      AND now() <= expires_at  -- Vérifier que la cagnotte globale n'est pas encore expirée
  LOOP
    v_hold_released_count := v_hold_released_count + 1;
    
    -- Retourner en IN_PROGRESS (pas EXPIRED)
    -- IMPORTANT: Ne pas mettre hold_duration_sec à NULL pour garder l'historique du timer
    UPDATE public.cagnotte
    SET status = 'IN_PROGRESS',
        hold_started_at = NULL,
        hold_expires_at = NULL,
        updated_at = now()
    WHERE id = v_expired_cagnottes.id;
    
    -- Libérer le HOLD sur les slots (les rendre disponibles)
    UPDATE public.field_availability
    SET on_hold_until = NULL,
        hold_cagnotte_id = NULL
    WHERE field_id = v_expired_cagnottes.field_id
      AND date = v_expired_cagnottes.slot_date
      AND start_time >= v_expired_cagnottes.slot_start_time
      AND start_time < v_expired_cagnottes.slot_end_time;
  END LOOP;
  
  -- 2. Gérer les cagnottes vraiment EXPIRÉES (expires_at dépassé)
  FOR v_expired_cagnottes IN
    SELECT *
    FROM public.cagnotte
    WHERE status IN ('IN_PROGRESS', 'HOLD')
      AND now() > expires_at
  LOOP
    v_expired_count := v_expired_count + 1;
    
    -- Passer en EXPIRED
    UPDATE public.cagnotte
    SET status = 'EXPIRED',
        updated_at = now()
    WHERE id = v_expired_cagnottes.id;
    
    -- Libérer le slot
    UPDATE public.field_availability
    SET on_hold_until = NULL,
        hold_cagnotte_id = NULL
    WHERE field_id = v_expired_cagnottes.field_id
      AND date = v_expired_cagnottes.slot_date
      AND start_time >= v_expired_cagnottes.slot_start_time
      AND start_time < v_expired_cagnottes.slot_end_time;
    
    -- Marquer les contributions pour remboursement
    UPDATE public.cagnotte_contribution
    SET status = 'REFUND_PENDING',
        refund_initiated_at = now()
    WHERE cagnotte_id = v_expired_cagnottes.id
      AND status = 'SUCCEEDED';
    
    -- Passer en REFUNDING
    UPDATE public.cagnotte
    SET status = 'REFUNDING'
    WHERE id = v_expired_cagnottes.id;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'expired_count', v_expired_count,
    'hold_released_count', v_hold_released_count,
    'timestamp', now()
  );
END;
$$;

COMMENT ON FUNCTION public.cleanup_expired_cagnottes() IS 
'Gère deux cas distincts:
1. HOLD expiré mais cagnotte encore active → retour en IN_PROGRESS (préserve hold_duration_sec)
2. expires_at dépassé → EXPIRED + remboursement';