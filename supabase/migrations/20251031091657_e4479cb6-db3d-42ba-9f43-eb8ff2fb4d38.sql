-- Migration: Correctifs finaux cagnotte - Multiples cagnottes par créneau + Arrondi CEIL + Auth check

-- 1. Supprimer la contrainte d'unicité qui empêche plusieurs cagnottes actives sur le même créneau
DROP INDEX IF EXISTS unique_active_cagnotte_per_slot;

-- 2. Ajouter contraintes pour garantir les montants entiers en XOF
ALTER TABLE public.cagnotte 
  DROP CONSTRAINT IF EXISTS chk_total_amount_int,
  ADD CONSTRAINT chk_total_amount_int CHECK (mod(total_amount, 1) = 0);

ALTER TABLE public.cagnotte_contribution 
  DROP CONSTRAINT IF EXISTS chk_amount_int,
  ADD CONSTRAINT chk_amount_int CHECK (mod(amount, 1) = 0);

-- 3. Mettre à jour create_cagnotte : autoriser plusieurs cagnottes, vérifier seulement les bookings
CREATE OR REPLACE FUNCTION public.create_cagnotte(
  p_field_id uuid, 
  p_slot_date date, 
  p_slot_start_time time without time zone, 
  p_slot_end_time time without time zone, 
  p_total_amount numeric, 
  p_split_teama numeric DEFAULT 50.00, 
  p_split_teamb numeric DEFAULT 50.00
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_preset_mode text;
  v_hold_threshold_pct numeric;
  v_timers jsonb;
  v_slot_datetime timestamptz;
  v_active_cagnottes_count integer;
  v_cagnotte_id uuid;
  v_expires_at timestamptz;
  v_total_int numeric;
  v_teama_target numeric;
  v_teamb_target numeric;
BEGIN
  -- 1. Anti-abus : vérifier le nombre de cagnottes actives du créateur
  SELECT COUNT(*) INTO v_active_cagnottes_count
  FROM public.cagnotte
  WHERE created_by_user_id = auth.uid()
    AND status IN ('IN_PROGRESS', 'HOLD');
  
  IF v_active_cagnottes_count >= 2 THEN
    RAISE EXCEPTION 'Tu as déjà 2 matchs en collecte. Termine-les ou annule-les avant d''en lancer un nouveau.';
  END IF;
  
  -- 2. Arrondir le montant total au supérieur (règle XOF)
  v_total_int := CEIL(p_total_amount);
  
  -- 3. Vérifier qu'il n'y a pas déjà une réservation confirmée sur ce créneau
  IF EXISTS (
    SELECT 1 FROM public.bookings
    WHERE field_id = p_field_id
      AND booking_date = p_slot_date
      AND start_time = p_slot_start_time
      AND end_time = p_slot_end_time
      AND status IN ('confirmed', 'owner_confirmed', 'completed')
  ) THEN
    RAISE EXCEPTION 'Ce créneau est déjà réservé';
  END IF;
  
  -- 4. Vérifier que TOUTES les tranches du range sont disponibles (is_available = true)
  -- On ne bloque plus sur les HOLDs d'autres cagnottes
  IF EXISTS (
    SELECT 1 FROM public.field_availability
    WHERE field_id = p_field_id
      AND date = p_slot_date
      AND start_time >= p_slot_start_time
      AND start_time < p_slot_end_time
      AND is_available = false
  ) THEN
    RAISE EXCEPTION 'Ce créneau n''est pas disponible';
  END IF;
  
  -- 5. Récupérer le preset du terrain
  SELECT hold_preset_mode INTO v_preset_mode
  FROM public.fields
  WHERE id = p_field_id;
  
  -- 6. Déterminer hold_threshold_pct selon le preset
  v_hold_threshold_pct := CASE v_preset_mode
    WHEN 'EXPRESS' THEN 60.00
    WHEN 'PROTECTEUR' THEN 40.00
    WHEN 'CONSERVATEUR' THEN 100.00
    ELSE 50.00  -- EQUILIBRE / AUTO
  END;
  
  -- 7. Calculer les timers dynamiques
  v_slot_datetime := (p_slot_date + p_slot_start_time)::timestamptz;
  v_timers := public.calculate_cagnotte_timers(v_slot_datetime);
  v_expires_at := now() + (v_timers->>'collect_window_sec')::integer * interval '1 second';
  
  -- 8. Calculer les cibles d'équipes (CEIL pour A, reste pour B)
  v_teama_target := CEIL(v_total_int * p_split_teama / 100);
  v_teamb_target := v_total_int - v_teama_target;
  
  -- 9. Créer la cagnotte
  INSERT INTO public.cagnotte (
    field_id,
    slot_date,
    slot_start_time,
    slot_end_time,
    status,
    total_amount,
    collected_amount,
    split_pct_teamA,
    split_pct_teamB,
    teamA_target,
    teamB_target,
    preset_mode,
    hold_threshold_pct,
    hold_duration_sec,
    collect_window_sec,
    expires_at,
    created_by_user_id
  ) VALUES (
    p_field_id,
    p_slot_date,
    p_slot_start_time,
    p_slot_end_time,
    'IN_PROGRESS',
    v_total_int,
    0,
    p_split_teama,
    p_split_teamb,
    v_teama_target,
    v_teamb_target,
    v_preset_mode,
    v_hold_threshold_pct,
    (v_timers->>'hold_duration_sec')::integer,
    (v_timers->>'collect_window_sec')::integer,
    v_expires_at,
    auth.uid()
  )
  RETURNING id INTO v_cagnotte_id;
  
  -- 10. Retourner les infos de la cagnotte créée
  RETURN jsonb_build_object(
    'success', true,
    'cagnotte_id', v_cagnotte_id,
    'expires_at', v_expires_at,
    'total_amount', v_total_int,
    'public_url', '/cagnotte/' || v_cagnotte_id
  );
END;
$$;

-- 4. Mettre à jour get_cagnotte_team_info pour utiliser CEIL
CREATE OR REPLACE FUNCTION public.get_cagnotte_team_info(p_cagnotte_id uuid, p_team text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_cagnotte record;
  v_team_target numeric;
  v_team_collected numeric;
  v_team_remaining numeric;
  v_team_size integer;
  v_suggested_part numeric;
  v_collected_a numeric;
  v_collected_b numeric;
BEGIN
  -- Get cagnotte info
  SELECT * INTO v_cagnotte
  FROM public.cagnotte
  WHERE id = p_cagnotte_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cagnotte introuvable';
  END IF;
  
  -- Validate team
  IF p_team NOT IN ('A', 'B') THEN
    RAISE EXCEPTION 'Équipe invalide: doit être A ou B';
  END IF;
  
  -- Calculate team-specific values
  IF p_team = 'A' THEN
    v_team_target := v_cagnotte.teama_target;
    v_team_size := v_cagnotte.teama_size;
  ELSE
    v_team_target := v_cagnotte.teamb_target;
    v_team_size := v_cagnotte.teamb_size;
  END IF;
  
  -- Calculate team collected amount
  SELECT COALESCE(SUM(amount), 0) INTO v_team_collected
  FROM public.cagnotte_contribution
  WHERE cagnotte_id = p_cagnotte_id
    AND team = p_team
    AND status = 'SUCCEEDED';
  
  -- Utiliser CEIL pour le reste et la part suggérée (entiers XOF)
  v_team_remaining := GREATEST(0, CEIL(v_team_target - v_team_collected));
  v_suggested_part := CEIL(v_team_target / v_team_size);
  
  -- Calculate both teams for progress bars
  SELECT COALESCE(SUM(amount), 0) INTO v_collected_a
  FROM public.cagnotte_contribution
  WHERE cagnotte_id = p_cagnotte_id
    AND team = 'A'
    AND status = 'SUCCEEDED';
  
  SELECT COALESCE(SUM(amount), 0) INTO v_collected_b
  FROM public.cagnotte_contribution
  WHERE cagnotte_id = p_cagnotte_id
    AND team = 'B'
    AND status = 'SUCCEEDED';
  
  RETURN jsonb_build_object(
    'team', p_team,
    'team_target', v_team_target,
    'team_collected', v_team_collected,
    'team_remaining', v_team_remaining,
    'team_size', v_team_size,
    'suggested_part', v_suggested_part,
    'teama_collected', v_collected_a,
    'teama_target', v_cagnotte.teama_target,
    'teamb_collected', v_collected_b,
    'teamb_target', v_cagnotte.teamb_target,
    'total_collected', v_cagnotte.collected_amount,
    'total_amount', v_cagnotte.total_amount,
    'status', v_cagnotte.status,
    'expires_at', v_cagnotte.expires_at,
    'hold_expires_at', v_cagnotte.hold_expires_at
  );
END;
$$;

-- 5. Mettre à jour contribute_to_cagnotte pour utiliser CEIL et supprimer MIN_CONTRIBUTION
CREATE OR REPLACE FUNCTION public.contribute_to_cagnotte(
  p_cagnotte_id uuid,
  p_amount numeric,
  p_team text DEFAULT NULL,
  p_psp_tx_id text DEFAULT NULL,
  p_method text DEFAULT 'MOMO',
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_cagnotte record;
  v_contribution_id uuid;
  v_new_collected numeric;
  v_hold_threshold_amount numeric;
  v_was_under_threshold boolean;
  v_is_now_over_threshold boolean;
  v_slot_datetime timestamptz;
  v_timers jsonb;
  v_hold_expires_at timestamptz;
  v_team_remaining numeric;
  v_requested_int numeric;
  v_amount_effective numeric;
  v_user_id uuid := auth.uid();
  v_handle_snapshot text;
  v_identity_badge text := 'ANON';
  v_payer_phone_hash text;
  v_payer_phone_masked text;
  v_instrument_type text;
  v_proof_code text;
  v_proof_token text;
  v_matched_profile record;
BEGIN
  -- Arrondir le montant au supérieur (règle XOF)
  v_requested_int := CEIL(p_amount);
  
  IF v_requested_int <= 0 THEN
    RAISE EXCEPTION 'Montant invalide';
  END IF;
  
  -- Extraire métadonnées payeur
  v_payer_phone_hash := p_metadata->>'payer_phone_hash';
  v_payer_phone_masked := p_metadata->>'payer_phone_masked';
  v_instrument_type := p_metadata->>'instrument_type';
  
  -- 1. Locker la cagnotte
  SELECT * INTO v_cagnotte
  FROM public.cagnotte
  WHERE id = p_cagnotte_id
  FOR UPDATE;
  
  -- 2. Vérifier l'état de la cagnotte
  IF v_cagnotte.status NOT IN ('IN_PROGRESS', 'HOLD') THEN
    RAISE EXCEPTION 'Cette cagnotte n''accepte plus de contributions (statut: %)', v_cagnotte.status;
  END IF;
  
  -- 3. Vérifier expiration
  IF now() > v_cagnotte.expires_at THEN
    RAISE EXCEPTION 'Cette cagnotte a expiré';
  END IF;
  
  -- 4. Calculer le reste de l'équipe et caper le montant (CEIL pour éviter les décimales)
  IF p_team IS NOT NULL THEN
    IF p_team = 'A' THEN
      v_team_remaining := GREATEST(0, CEIL(v_cagnotte.teama_target - COALESCE((
        SELECT SUM(amount) FROM public.cagnotte_contribution 
        WHERE cagnotte_id = p_cagnotte_id AND team = 'A' AND status = 'SUCCEEDED'
      ), 0)));
    ELSIF p_team = 'B' THEN
      v_team_remaining := GREATEST(0, CEIL(v_cagnotte.teamb_target - COALESCE((
        SELECT SUM(amount) FROM public.cagnotte_contribution 
        WHERE cagnotte_id = p_cagnotte_id AND team = 'B' AND status = 'SUCCEEDED'
      ), 0)));
    ELSE
      RAISE EXCEPTION 'Équipe invalide';
    END IF;
    
    v_amount_effective := LEAST(v_requested_int, v_team_remaining);
    
    IF v_amount_effective <= 0 THEN
      RAISE EXCEPTION 'Montant invalide ou équipe déjà complète';
    END IF;
  ELSE
    v_amount_effective := v_requested_int;
  END IF;
  
  -- 5. Auto-attribution si phone match
  IF v_payer_phone_hash IS NOT NULL THEN
    SELECT id, handle, phone_verified INTO v_matched_profile
    FROM public.profiles
    WHERE phone_hash = v_payer_phone_hash
    LIMIT 1;
    
    IF FOUND THEN
      v_user_id := v_matched_profile.id;
      v_handle_snapshot := v_matched_profile.handle;
      v_identity_badge := CASE 
        WHEN v_matched_profile.phone_verified THEN 'VERIFIED'
        ELSE 'LINKED'
      END;
    END IF;
  END IF;
  
  -- 6. Générer codes preuve
  v_proof_code := public.generate_proof_code();
  v_proof_token := public.generate_proof_token();
  
  -- 7. Créer la contribution (statut SUCCEEDED car paiement déjà fait via PSP)
  INSERT INTO public.cagnotte_contribution (
    cagnotte_id,
    user_id,
    team,
    amount,
    method,
    psp_tx_id,
    status,
    paid_at,
    handle_snapshot,
    identity_badge,
    payer_phone_hash,
    payer_phone_masked,
    proof_code,
    proof_token,
    instrument_type,
    metadata
  ) VALUES (
    p_cagnotte_id,
    v_user_id,
    p_team,
    v_amount_effective,
    p_method,
    p_psp_tx_id,
    'SUCCEEDED',
    now(),
    v_handle_snapshot,
    v_identity_badge,
    v_payer_phone_hash,
    v_payer_phone_masked,
    v_proof_code,
    v_proof_token,
    v_instrument_type,
    p_metadata
  )
  ON CONFLICT (psp_tx_id) DO NOTHING
  RETURNING id INTO v_contribution_id;
  
  -- Si conflit (déjà traité), retourner l'existant
  IF v_contribution_id IS NULL THEN
    SELECT id, proof_code INTO v_contribution_id, v_proof_code
    FROM public.cagnotte_contribution
    WHERE psp_tx_id = p_psp_tx_id;
    
    RETURN jsonb_build_object(
      'success', true,
      'contribution_id', v_contribution_id,
      'proof_code', v_proof_code,
      'already_processed', true
    );
  END IF;
  
  -- 8. Calculer le nouveau montant collecté
  v_new_collected := v_cagnotte.collected_amount + v_amount_effective;
  v_hold_threshold_amount := v_cagnotte.total_amount * v_cagnotte.hold_threshold_pct / 100;
  
  v_was_under_threshold := v_cagnotte.collected_amount < v_hold_threshold_amount;
  v_is_now_over_threshold := v_new_collected >= v_hold_threshold_amount;
  
  -- 9. Vérifier si on atteint 100% → confirmer immédiatement
  IF v_new_collected >= v_cagnotte.total_amount THEN
    UPDATE public.cagnotte
    SET collected_amount = v_cagnotte.total_amount,
        updated_at = now()
    WHERE id = p_cagnotte_id;
    
    PERFORM public.confirm_cagnotte_and_lock_slot(p_cagnotte_id);
    
    RETURN jsonb_build_object(
      'success', true,
      'contribution_id', v_contribution_id,
      'proof_code', v_proof_code,
      'cagnotte_status', 'CONFIRMED',
      'collected_amount', v_cagnotte.total_amount,
      'progress_pct', 100
    );
  END IF;
  
  -- 10. Vérifier si on passe en HOLD
  IF v_was_under_threshold AND v_is_now_over_threshold AND v_cagnotte.status = 'IN_PROGRESS' THEN
    v_slot_datetime := (v_cagnotte.slot_date + v_cagnotte.slot_start_time)::timestamptz;
    v_timers := public.calculate_cagnotte_timers(v_slot_datetime);
    v_hold_expires_at := now() + (v_timers->>'hold_duration_sec')::integer * interval '1 second';
    
    UPDATE public.cagnotte
    SET status = 'HOLD',
        collected_amount = v_new_collected,
        hold_started_at = now(),
        hold_expires_at = v_hold_expires_at,
        hold_duration_sec = (v_timers->>'hold_duration_sec')::integer,
        updated_at = now()
    WHERE id = p_cagnotte_id;
    
    UPDATE public.field_availability
    SET on_hold_until = v_hold_expires_at,
        hold_cagnotte_id = p_cagnotte_id
    WHERE field_id = v_cagnotte.field_id
      AND date = v_cagnotte.slot_date
      AND start_time >= v_cagnotte.slot_start_time
      AND start_time < v_cagnotte.slot_end_time;
    
    RETURN jsonb_build_object(
      'success', true,
      'contribution_id', v_contribution_id,
      'proof_code', v_proof_code,
      'cagnotte_status', 'HOLD',
      'collected_amount', v_new_collected,
      'progress_pct', (v_new_collected / v_cagnotte.total_amount * 100)::numeric(5,2),
      'hold_expires_at', v_hold_expires_at
    );
  END IF;
  
  -- 11. Mise à jour simple si pas de changement de statut
  UPDATE public.cagnotte
  SET collected_amount = v_new_collected,
      updated_at = now()
  WHERE id = p_cagnotte_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'contribution_id', v_contribution_id,
    'proof_code', v_proof_code,
    'cagnotte_status', v_cagnotte.status,
    'collected_amount', v_new_collected,
    'progress_pct', (v_new_collected / v_cagnotte.total_amount * 100)::numeric(5,2)
  );
END;
$$;