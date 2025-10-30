-- Migration: Attribution auto par numéro (OTP), Preuve publique & Reçu secret

-- 1. Ajouter colonnes à profiles pour vérification téléphonique
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS handle TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS phone_hash TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_profiles_phone_hash ON public.profiles(phone_hash);
CREATE INDEX IF NOT EXISTS idx_profiles_handle ON public.profiles(handle);

COMMENT ON COLUMN public.profiles.handle IS 'Pseudo unique de l''utilisateur (ex: @john)';
COMMENT ON COLUMN public.profiles.phone_hash IS 'SHA256 du numéro normalisé E.164 pour matching sans stocker le numéro';
COMMENT ON COLUMN public.profiles.phone_verified IS 'True si le numéro a été vérifié par OTP';

-- 2. Ajouter colonnes à cagnotte_contribution pour attribution et preuves
ALTER TABLE public.cagnotte_contribution
  ADD COLUMN IF NOT EXISTS handle_snapshot TEXT,
  ADD COLUMN IF NOT EXISTS identity_badge TEXT CHECK (identity_badge IN ('VERIFIED', 'LINKED', 'ANON')),
  ADD COLUMN IF NOT EXISTS payer_phone_hash TEXT,
  ADD COLUMN IF NOT EXISTS payer_phone_masked TEXT,
  ADD COLUMN IF NOT EXISTS proof_code TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS proof_token TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS instrument_type TEXT;

CREATE INDEX IF NOT EXISTS idx_contribution_proof_code ON public.cagnotte_contribution(proof_code);
CREATE INDEX IF NOT EXISTS idx_contribution_proof_token ON public.cagnotte_contribution(proof_token);
CREATE INDEX IF NOT EXISTS idx_contribution_payer_hash ON public.cagnotte_contribution(payer_phone_hash);

COMMENT ON COLUMN public.cagnotte_contribution.handle_snapshot IS 'Handle au moment de la contribution (peut changer après)';
COMMENT ON COLUMN public.cagnotte_contribution.identity_badge IS 'VERIFIED: numéro match + vérifié, LINKED: réclamé manuellement, ANON: pas de compte';
COMMENT ON COLUMN public.cagnotte_contribution.payer_phone_hash IS 'Hash SHA256 du numéro du payeur (from PSP)';
COMMENT ON COLUMN public.cagnotte_contribution.payer_phone_masked IS 'Numéro masqué pour affichage (ex: ****85)';
COMMENT ON COLUMN public.cagnotte_contribution.proof_code IS 'Code court (6-8 chars) pour URL publique /p/:code';
COMMENT ON COLUMN public.cagnotte_contribution.proof_token IS 'Token secret (32+ chars) pour URL reçu /receipt/:token';

-- 3. Fonction pour générer un code proof unique
CREATE OR REPLACE FUNCTION public.generate_proof_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  result TEXT := '';
  i INTEGER;
  code_exists BOOLEAN;
BEGIN
  LOOP
    result := '';
    FOR i IN 1..8 LOOP
      result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    
    SELECT EXISTS(SELECT 1 FROM public.cagnotte_contribution WHERE proof_code = result) INTO code_exists;
    
    IF NOT code_exists THEN
      EXIT;
    END IF;
  END LOOP;
  
  RETURN result;
END;
$$;

-- 4. Fonction pour générer un token proof unique
CREATE OR REPLACE FUNCTION public.generate_proof_token()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  result TEXT;
  token_exists BOOLEAN;
BEGIN
  LOOP
    result := encode(gen_random_bytes(32), 'hex');
    
    SELECT EXISTS(SELECT 1 FROM public.cagnotte_contribution WHERE proof_token = result) INTO token_exists;
    
    IF NOT token_exists THEN
      EXIT;
    END IF;
  END LOOP;
  
  RETURN result;
END;
$$;

-- 5. Mettre à jour contribute_to_cagnotte pour gérer attribution et preuves
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
  -- Validation montant
  IF p_amount <= 0 THEN
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
      v_team_remaining := v_cagnotte.teama_target - COALESCE((
        SELECT SUM(amount) FROM public.cagnotte_contribution 
        WHERE cagnotte_id = p_cagnotte_id AND team = 'A' AND status = 'SUCCEEDED'
      ), 0);
    ELSIF p_team = 'B' THEN
      v_team_remaining := v_cagnotte.teamb_target - COALESCE((
        SELECT SUM(amount) FROM public.cagnotte_contribution 
        WHERE cagnotte_id = p_cagnotte_id AND team = 'B' AND status = 'SUCCEEDED'
      ), 0);
    ELSE
      RAISE EXCEPTION 'Équipe invalide';
    END IF;
    
    v_amount_effective := LEAST(p_amount, v_team_remaining);
  ELSE
    v_amount_effective := p_amount;
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

-- 6. RLS policies pour les nouvelles colonnes
ALTER TABLE public.cagnotte_contribution ENABLE ROW LEVEL SECURITY;

-- Lecture publique des preuves (via proof_code)
CREATE POLICY "Public can view contributions by proof_code"
ON public.cagnotte_contribution
FOR SELECT
USING (proof_code IS NOT NULL);

-- Les utilisateurs peuvent voir leurs propres contributions
CREATE POLICY "Users can view their own contributions"
ON public.cagnotte_contribution
FOR SELECT
USING (user_id = auth.uid());