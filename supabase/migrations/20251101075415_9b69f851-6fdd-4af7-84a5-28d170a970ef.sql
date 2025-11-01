-- Modifier contribute_to_cagnotte pour accepter un user_id optionnel et l'auto-attribution
CREATE OR REPLACE FUNCTION public.contribute_to_cagnotte(
  p_cagnotte_id uuid,
  p_amount numeric,
  p_team text DEFAULT NULL::text,
  p_psp_tx_id text DEFAULT NULL::text,
  p_method text DEFAULT 'MOMO'::text,
  p_metadata jsonb DEFAULT '{}'::jsonb,
  p_user_id uuid DEFAULT NULL::uuid  -- NOUVEAU paramètre
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
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
  v_final_user_id uuid;
  v_handle_snapshot text;
  v_identity_badge text := 'ANON';
  v_payer_phone_hash text;
  v_payer_phone_masked text;
  v_instrument_type text;
  v_proof_code text;
  v_proof_token text;
  v_matched_profile record;
  v_user_phone_hash text;
  v_phone_verified boolean;
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
  
  -- 4. Calculer le reste de l'équipe et caper le montant
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
  
  -- 5. NOUVELLE LOGIQUE: Attribution automatique si user_id fourni
  IF p_user_id IS NOT NULL THEN
    -- Récupérer les infos du profil
    SELECT id, handle, phone_hash, phone_verified 
    INTO v_matched_profile
    FROM public.profiles
    WHERE id = p_user_id
    LIMIT 1;
    
    IF FOUND THEN
      v_final_user_id := v_matched_profile.id;
      v_handle_snapshot := v_matched_profile.handle;
      v_user_phone_hash := v_matched_profile.phone_hash;
      v_phone_verified := v_matched_profile.phone_verified;
      
      -- Déterminer le badge selon la correspondance du téléphone
      IF v_phone_verified AND v_payer_phone_hash IS NOT NULL AND v_user_phone_hash = v_payer_phone_hash THEN
        v_identity_badge := 'VERIFIED';  -- ✅ Numéro match
      ELSE
        v_identity_badge := 'LINKED';    -- 🔗 Utilisateur connecté mais numéro différent ou non vérifié
      END IF;
    ELSE
      -- user_id fourni mais pas trouvé dans profiles → fallback anonyme
      v_final_user_id := NULL;
      v_handle_snapshot := NULL;
      v_identity_badge := 'ANON';
    END IF;
  ELSE
    -- Pas de user_id fourni → Tentative d'auto-attribution par téléphone
    IF v_payer_phone_hash IS NOT NULL THEN
      SELECT id, handle, phone_verified INTO v_matched_profile
      FROM public.profiles
      WHERE phone_hash = v_payer_phone_hash
      LIMIT 1;
      
      IF FOUND THEN
        v_final_user_id := v_matched_profile.id;
        v_handle_snapshot := v_matched_profile.handle;
        v_identity_badge := CASE 
          WHEN v_matched_profile.phone_verified THEN 'VERIFIED'
          ELSE 'LINKED'
        END;
      END IF;
    END IF;
  END IF;
  
  -- 6. Générer codes preuve
  v_proof_code := public.generate_proof_code();
  v_proof_token := public.generate_proof_token();
  
  -- 7. Créer la contribution
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
    v_final_user_id,
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