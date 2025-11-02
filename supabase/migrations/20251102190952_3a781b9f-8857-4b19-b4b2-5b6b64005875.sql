-- Migration: Ajout de la persistance des remboursements pour les cagnottes
-- 1. Ajouter cancellation_reason à la table cagnotte
ALTER TABLE public.cagnotte 
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
ADD COLUMN IF NOT EXISTS refund_completed_at TIMESTAMPTZ;

COMMENT ON COLUMN public.cagnotte.cancellation_reason IS 'Raison de l''annulation de la cagnotte (réservation directe, expiration, etc.)';
COMMENT ON COLUMN public.cagnotte.refund_completed_at IS 'Date de complétion de tous les remboursements pour cette cagnotte';

-- 2. Ajouter les colonnes de suivi des remboursements à cagnotte_contribution
ALTER TABLE public.cagnotte_contribution
ADD COLUMN IF NOT EXISTS refund_status TEXT,
ADD COLUMN IF NOT EXISTS refund_reference TEXT,
ADD COLUMN IF NOT EXISTS refund_attempt_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS refund_last_attempt_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS refund_last_error TEXT;

-- Index pour les remboursements en attente
CREATE INDEX IF NOT EXISTS idx_cagnotte_contribution_refund_pending 
ON public.cagnotte_contribution(cagnotte_id, refund_status) 
WHERE refund_status = 'PENDING';

COMMENT ON COLUMN public.cagnotte_contribution.refund_status IS 'Statut du remboursement: PENDING, PROCESSING, REFUNDED, FAILED';
COMMENT ON COLUMN public.cagnotte_contribution.refund_reference IS 'Référence du déboursement PayDunya (pour idempotence)';
COMMENT ON COLUMN public.cagnotte_contribution.refund_attempt_count IS 'Nombre de tentatives de remboursement';
COMMENT ON COLUMN public.cagnotte_contribution.refund_last_attempt_at IS 'Date de la dernière tentative de remboursement';
COMMENT ON COLUMN public.cagnotte_contribution.refund_last_error IS 'Dernier message d''erreur en cas d''échec';

-- 3. Fonction pour mettre à jour le statut de remboursement de la cagnotte
CREATE OR REPLACE FUNCTION public.update_cagnotte_refund_status(p_cagnotte_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_contributions INTEGER;
  v_refunded_contributions INTEGER;
  v_cagnotte_status TEXT;
BEGIN
  -- Récupérer le statut actuel de la cagnotte
  SELECT status INTO v_cagnotte_status
  FROM public.cagnotte
  WHERE id = p_cagnotte_id;
  
  -- Ne rien faire si la cagnotte n'est pas en REFUNDING
  IF v_cagnotte_status != 'REFUNDING' THEN
    RETURN;
  END IF;
  
  -- Compter le total des contributions et celles remboursées
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE refund_status = 'REFUNDED')
  INTO v_total_contributions, v_refunded_contributions
  FROM public.cagnotte_contribution
  WHERE cagnotte_id = p_cagnotte_id
    AND status = 'SUCCEEDED'; -- Seules les contributions réussies doivent être remboursées
  
  -- Si toutes les contributions sont remboursées, passer la cagnotte en REFUNDED
  IF v_total_contributions > 0 AND v_total_contributions = v_refunded_contributions THEN
    UPDATE public.cagnotte
    SET 
      status = 'REFUNDED',
      refund_completed_at = NOW(),
      updated_at = NOW()
    WHERE id = p_cagnotte_id;
    
    RAISE NOTICE 'Cagnotte % passée en REFUNDED - %/% contributions remboursées', 
      p_cagnotte_id, v_refunded_contributions, v_total_contributions;
  END IF;
END;
$$;

COMMENT ON FUNCTION public.update_cagnotte_refund_status IS 
'Vérifie si toutes les contributions d''une cagnotte en REFUNDING sont remboursées et passe le statut à REFUNDED';

-- 4. Mettre à jour cleanup_expired_cagnottes pour gérer les remboursements
CREATE OR REPLACE FUNCTION public.cleanup_expired_cagnottes()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_released_count int := 0;
  v_cancelled_count int := 0;
  v_cagnotte_rec RECORD;
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
    -- Passer la cagnotte en REFUNDING
    UPDATE public.cagnotte
    SET 
      status = 'REFUNDING',
      cancellation_reason = 'Cagnotte expirée sans atteindre le seuil de HOLD',
      updated_at = now()
    WHERE id = v_cagnotte_rec.id;
    
    -- Marquer toutes les contributions réussies comme REFUND_PENDING
    UPDATE public.cagnotte_contribution
    SET 
      refund_status = 'PENDING',
      updated_at = now()
    WHERE cagnotte_id = v_cagnotte_rec.id
      AND status = 'SUCCEEDED'
      AND (refund_status IS NULL OR refund_status = '');
    
    v_cancelled_count := v_cancelled_count + 1;
  END LOOP;
  
  RAISE NOTICE 'cleanup_expired_cagnottes: % HOLD libérés, % IN_PROGRESS expirées → REFUNDING', 
    v_released_count, v_cancelled_count;
END;
$$;

-- 5. Mettre à jour cancel_conflicting_cagnottes_in_progress pour gérer les remboursements
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
    -- Passer en REFUNDING avec raison
    UPDATE public.cagnotte
    SET 
      status = 'REFUNDING',
      cancellation_reason = 'Réservation directe confirmée',
      updated_at = now()
    WHERE id = v_cagnotte_rec.id;
    
    -- Marquer toutes les contributions réussies comme REFUND_PENDING
    UPDATE public.cagnotte_contribution
    SET 
      refund_status = 'PENDING',
      updated_at = now()
    WHERE cagnotte_id = v_cagnotte_rec.id
      AND status = 'SUCCEEDED'
      AND (refund_status IS NULL OR refund_status = '');
    
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;