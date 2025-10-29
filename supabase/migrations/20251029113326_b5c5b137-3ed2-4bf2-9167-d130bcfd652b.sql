-- ============================================================
-- FEATURE: CAGNOTTE ÉQUIPE (Team Pot)
-- Description: Permet à un groupe de payer collectivement une réservation
-- ============================================================

-- 1. Créer la table cagnotte
CREATE TABLE public.cagnotte (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Terrain et créneau ciblé
  field_id uuid NOT NULL REFERENCES public.fields(id) ON DELETE CASCADE,
  slot_date date NOT NULL,
  slot_start_time time NOT NULL,
  slot_end_time time NOT NULL,
  
  -- État de la cagnotte
  status text NOT NULL CHECK (
    status IN ('IN_PROGRESS','HOLD','CONFIRMED','EXPIRED','REFUNDING','REFUNDED')
  ),
  
  -- Montants (en XOF)
  total_amount numeric(12,2) NOT NULL,
  collected_amount numeric(12,2) NOT NULL DEFAULT 0,
  
  -- Répartition équipes (optionnel)
  split_pct_teamA numeric(5,2),
  split_pct_teamB numeric(5,2),
  teamA_target numeric(12,2),
  teamB_target numeric(12,2),
  
  -- Preset et paramètres dynamiques
  preset_mode text NOT NULL DEFAULT 'EQUILIBRE' CHECK (
    preset_mode IN ('AUTO','EQUILIBRE','EXPRESS','PROTECTEUR','CONSERVATEUR')
  ),
  hold_threshold_pct numeric(5,2) NOT NULL,
  hold_duration_sec integer NOT NULL,
  collect_window_sec integer NOT NULL,
  
  -- Timers
  expires_at timestamptz NOT NULL,
  hold_started_at timestamptz,
  hold_expires_at timestamptz,
  
  -- Créateur (capitaine)
  created_by_user_id uuid NOT NULL REFERENCES auth.users(id),
  
  -- Métadonnées
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version integer NOT NULL DEFAULT 0
);

-- Index pour performance
CREATE INDEX idx_cagnotte_field_slot ON public.cagnotte(field_id, slot_date, slot_start_time);
CREATE INDEX idx_cagnotte_status ON public.cagnotte(status);
CREATE INDEX idx_cagnotte_creator ON public.cagnotte(created_by_user_id);
CREATE INDEX idx_cagnotte_expires ON public.cagnotte(expires_at) WHERE status IN ('IN_PROGRESS', 'HOLD');

-- RLS Policies
ALTER TABLE public.cagnotte ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view cagnottes"
  ON public.cagnotte FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create cagnottes"
  ON public.cagnotte FOR INSERT
  WITH CHECK (auth.uid() = created_by_user_id);

CREATE POLICY "Creators can update their cagnottes"
  ON public.cagnotte FOR UPDATE
  USING (auth.uid() = created_by_user_id);

-- 2. Créer la table cagnotte_contribution
CREATE TABLE public.cagnotte_contribution (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  cagnotte_id uuid NOT NULL REFERENCES public.cagnotte(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id),
  team text CHECK (team IN ('A','B') OR team IS NULL),
  
  -- Montant et méthode
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  method text,
  psp_tx_id text UNIQUE,
  
  -- État du paiement
  status text NOT NULL CHECK (
    status IN ('PENDING','SUCCEEDED','FAILED','REFUND_PENDING','REFUNDED')
  ),
  
  -- Timestamps
  paid_at timestamptz,
  refund_initiated_at timestamptz,
  refunded_at timestamptz,
  
  -- Métadonnées pour debug/support
  metadata jsonb DEFAULT '{}'::jsonb,
  
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index
CREATE INDEX idx_contribution_cagnotte ON public.cagnotte_contribution(cagnotte_id);
CREATE INDEX idx_contribution_user ON public.cagnotte_contribution(user_id);
CREATE INDEX idx_contribution_status ON public.cagnotte_contribution(status);
CREATE INDEX idx_contribution_psp_tx ON public.cagnotte_contribution(psp_tx_id);

-- RLS Policies
ALTER TABLE public.cagnotte_contribution ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view contributions"
  ON public.cagnotte_contribution FOR SELECT
  USING (true);

CREATE POLICY "Users can create contributions"
  ON public.cagnotte_contribution FOR INSERT
  WITH CHECK (user_id IS NULL OR auth.uid() = user_id);

-- 3. Modifier field_availability pour le HOLD
ALTER TABLE public.field_availability
ADD COLUMN IF NOT EXISTS on_hold_until timestamptz NULL,
ADD COLUMN IF NOT EXISTS hold_cagnotte_id uuid NULL REFERENCES public.cagnotte(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_field_availability_hold ON public.field_availability(on_hold_until) 
  WHERE on_hold_until IS NOT NULL;

-- 4. Ajouter preset aux terrains
ALTER TABLE public.fields
ADD COLUMN IF NOT EXISTS hold_preset_mode text NOT NULL DEFAULT 'EQUILIBRE' CHECK (
  hold_preset_mode IN ('AUTO','EQUILIBRE','EXPRESS','PROTECTEUR','CONSERVATEUR')
),
ADD COLUMN IF NOT EXISTS preset_last_changed_at timestamptz DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_fields_preset ON public.fields(hold_preset_mode);

-- 5. Fonction utilitaire pour calculer les timers dynamiques
CREATE OR REPLACE FUNCTION public.calculate_cagnotte_timers(
  slot_datetime timestamptz
)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  time_until_slot interval;
  hours_until_slot numeric;
  hold_duration_sec integer;
  collect_window_sec integer;
BEGIN
  time_until_slot := slot_datetime - now();
  hours_until_slot := EXTRACT(EPOCH FROM time_until_slot) / 3600;
  
  -- Déterminer hold_duration_sec selon la table des durées
  IF hours_until_slot > 48 THEN
    hold_duration_sec := 600;  -- 10 min
  ELSIF hours_until_slot > 24 THEN
    hold_duration_sec := 600;  -- 10 min
  ELSIF hours_until_slot > 6 THEN
    hold_duration_sec := 480;  -- 8 min
  ELSIF hours_until_slot > 2 THEN
    hold_duration_sec := 420;  -- 7 min
  ELSIF hours_until_slot > 1 THEN
    hold_duration_sec := 300;  -- 5 min
  ELSE
    hold_duration_sec := 120;  -- 2 min
  END IF;
  
  -- Déterminer collect_window_sec
  IF hours_until_slot > 48 THEN
    collect_window_sec := 3600;  -- 60 min
  ELSIF hours_until_slot > 24 THEN
    collect_window_sec := 2700;  -- 45 min
  ELSIF hours_until_slot > 6 THEN
    collect_window_sec := 1800;  -- 30 min
  ELSIF hours_until_slot > 2 THEN
    collect_window_sec := 1200;  -- 20 min
  ELSIF hours_until_slot > 1 THEN
    collect_window_sec := 900;   -- 15 min
  ELSE
    collect_window_sec := 600;   -- 10 min
  END IF;
  
  RETURN jsonb_build_object(
    'hold_duration_sec', hold_duration_sec,
    'collect_window_sec', collect_window_sec
  );
END;
$$;

-- 6. Fonction pour créer une cagnotte
CREATE OR REPLACE FUNCTION public.create_cagnotte(
  p_field_id uuid,
  p_slot_date date,
  p_slot_start_time time,
  p_slot_end_time time,
  p_split_teamA numeric DEFAULT 50.00,
  p_split_teamB numeric DEFAULT 50.00
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_amount numeric;
  v_preset_mode text;
  v_hold_threshold_pct numeric;
  v_timers jsonb;
  v_slot_datetime timestamptz;
  v_active_cagnottes_count integer;
  v_cagnotte_id uuid;
  v_expires_at timestamptz;
BEGIN
  -- 1. Anti-abus : vérifier le nombre de cagnottes actives du créateur
  SELECT COUNT(*) INTO v_active_cagnottes_count
  FROM public.cagnotte
  WHERE created_by_user_id = auth.uid()
    AND status IN ('IN_PROGRESS', 'HOLD');
  
  IF v_active_cagnottes_count >= 2 THEN
    RAISE EXCEPTION 'Tu as déjà 2 matchs en collecte. Termine-les ou annule-les avant d''en lancer un nouveau.';
  END IF;
  
  -- 2. Vérifier que le créneau existe et est disponible
  IF NOT EXISTS (
    SELECT 1 FROM public.field_availability
    WHERE field_id = p_field_id
      AND date = p_slot_date
      AND start_time = p_slot_start_time
      AND end_time = p_slot_end_time
      AND is_available = true
      AND (on_hold_until IS NULL OR on_hold_until < now())
  ) THEN
    RAISE EXCEPTION 'Ce créneau n''est pas disponible';
  END IF;
  
  -- 3. Vérifier qu'il n'y a pas déjà une réservation confirmée
  IF EXISTS (
    SELECT 1 FROM public.bookings
    WHERE field_id = p_field_id
      AND booking_date = p_slot_date
      AND start_time = p_slot_start_time
      AND status IN ('confirmed', 'owner_confirmed', 'completed')
      AND payment_status = 'paid'
  ) THEN
    RAISE EXCEPTION 'Ce créneau est déjà réservé';
  END IF;
  
  -- 4. Récupérer le prix du terrain et le preset
  SELECT price_per_hour, hold_preset_mode
  INTO v_total_amount, v_preset_mode
  FROM public.fields
  WHERE id = p_field_id;
  
  -- 5. Déterminer hold_threshold_pct selon le preset
  v_hold_threshold_pct := CASE v_preset_mode
    WHEN 'EXPRESS' THEN 60.00
    WHEN 'PROTECTEUR' THEN 40.00
    WHEN 'CONSERVATEUR' THEN 100.00
    ELSE 50.00  -- EQUILIBRE / AUTO
  END;
  
  -- 6. Calculer les timers dynamiques
  v_slot_datetime := (p_slot_date + p_slot_start_time)::timestamptz;
  v_timers := public.calculate_cagnotte_timers(v_slot_datetime);
  v_expires_at := now() + (v_timers->>'collect_window_sec')::integer * interval '1 second';
  
  -- 7. Créer la cagnotte
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
    v_total_amount,
    0,
    p_split_teamA,
    p_split_teamB,
    v_total_amount * p_split_teamA / 100,
    v_total_amount * p_split_teamB / 100,
    v_preset_mode,
    v_hold_threshold_pct,
    (v_timers->>'hold_duration_sec')::integer,
    (v_timers->>'collect_window_sec')::integer,
    v_expires_at,
    auth.uid()
  )
  RETURNING id INTO v_cagnotte_id;
  
  -- 8. Retourner les infos de la cagnotte créée
  RETURN jsonb_build_object(
    'success', true,
    'cagnotte_id', v_cagnotte_id,
    'expires_at', v_expires_at,
    'total_amount', v_total_amount,
    'public_url', '/cagnotte/' || v_cagnotte_id
  );
END;
$$;

-- 7. Fonction pour contribuer à une cagnotte
CREATE OR REPLACE FUNCTION public.contribute_to_cagnotte(
  p_cagnotte_id uuid,
  p_amount numeric,
  p_team text DEFAULT NULL,
  p_method text DEFAULT 'MOMO',
  p_psp_tx_id text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
  MIN_CONTRIBUTION constant numeric := 3000.00;
BEGIN
  -- 1. Vérifier le montant minimum
  IF p_amount < MIN_CONTRIBUTION THEN
    RAISE EXCEPTION 'Le montant minimum est de % XOF', MIN_CONTRIBUTION;
  END IF;
  
  -- 2. Locker la cagnotte (FOR UPDATE pour éviter les races)
  SELECT * INTO v_cagnotte
  FROM public.cagnotte
  WHERE id = p_cagnotte_id
  FOR UPDATE;
  
  -- 3. Vérifier l'état de la cagnotte
  IF v_cagnotte.status NOT IN ('IN_PROGRESS', 'HOLD') THEN
    RAISE EXCEPTION 'Cette cagnotte n''accepte plus de contributions (statut: %)', v_cagnotte.status;
  END IF;
  
  -- 4. Vérifier expiration
  IF now() > v_cagnotte.expires_at THEN
    RAISE EXCEPTION 'Cette cagnotte a expiré';
  END IF;
  
  -- 5. Créer la contribution (statut SUCCEEDED car paiement déjà fait via PSP)
  INSERT INTO public.cagnotte_contribution (
    cagnotte_id,
    user_id,
    team,
    amount,
    method,
    psp_tx_id,
    status,
    paid_at
  ) VALUES (
    p_cagnotte_id,
    auth.uid(),
    p_team,
    p_amount,
    p_method,
    p_psp_tx_id,
    'SUCCEEDED',
    now()
  )
  RETURNING id INTO v_contribution_id;
  
  -- 6. Calculer le nouveau montant collecté
  v_new_collected := v_cagnotte.collected_amount + p_amount;
  v_hold_threshold_amount := v_cagnotte.total_amount * v_cagnotte.hold_threshold_pct / 100;
  
  v_was_under_threshold := v_cagnotte.collected_amount < v_hold_threshold_amount;
  v_is_now_over_threshold := v_new_collected >= v_hold_threshold_amount;
  
  -- 7. Vérifier si on atteint 100% → confirmer immédiatement
  IF v_new_collected >= v_cagnotte.total_amount THEN
    UPDATE public.cagnotte
    SET collected_amount = v_cagnotte.total_amount,
        updated_at = now()
    WHERE id = p_cagnotte_id;
    
    -- Appeler la confirmation
    PERFORM public.confirm_cagnotte_and_lock_slot(p_cagnotte_id);
    
    RETURN jsonb_build_object(
      'success', true,
      'contribution_id', v_contribution_id,
      'cagnotte_status', 'CONFIRMED',
      'collected_amount', v_cagnotte.total_amount,
      'progress_pct', 100
    );
  END IF;
  
  -- 8. Vérifier si on passe en HOLD
  IF v_was_under_threshold AND v_is_now_over_threshold AND v_cagnotte.status = 'IN_PROGRESS' THEN
    -- Recalculer hold_duration_sec selon le temps restant MAINTENANT
    v_slot_datetime := (v_cagnotte.slot_date + v_cagnotte.slot_start_time)::timestamptz;
    v_timers := public.calculate_cagnotte_timers(v_slot_datetime);
    v_hold_expires_at := now() + (v_timers->>'hold_duration_sec')::integer * interval '1 second';
    
    -- Passer en HOLD
    UPDATE public.cagnotte
    SET status = 'HOLD',
        collected_amount = v_new_collected,
        hold_started_at = now(),
        hold_expires_at = v_hold_expires_at,
        hold_duration_sec = (v_timers->>'hold_duration_sec')::integer,
        updated_at = now()
    WHERE id = p_cagnotte_id;
    
    -- Mettre le slot en HOLD
    UPDATE public.field_availability
    SET on_hold_until = v_hold_expires_at,
        hold_cagnotte_id = p_cagnotte_id
    WHERE field_id = v_cagnotte.field_id
      AND date = v_cagnotte.slot_date
      AND start_time = v_cagnotte.slot_start_time;
    
    RETURN jsonb_build_object(
      'success', true,
      'contribution_id', v_contribution_id,
      'cagnotte_status', 'HOLD',
      'collected_amount', v_new_collected,
      'progress_pct', (v_new_collected / v_cagnotte.total_amount * 100)::numeric(5,2),
      'hold_expires_at', v_hold_expires_at
    );
  END IF;
  
  -- 9. Mise à jour simple si pas de changement de statut
  UPDATE public.cagnotte
  SET collected_amount = v_new_collected,
      updated_at = now()
  WHERE id = p_cagnotte_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'contribution_id', v_contribution_id,
    'cagnotte_status', v_cagnotte.status,
    'collected_amount', v_new_collected,
    'progress_pct', (v_new_collected / v_cagnotte.total_amount * 100)::numeric(5,2)
  );
END;
$$;

-- 8. Fonction pour confirmer et bloquer le slot
CREATE OR REPLACE FUNCTION public.confirm_cagnotte_and_lock_slot(
  p_cagnotte_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cagnotte record;
  v_booking_id uuid;
  v_field_record record;
  v_amount_checkout numeric;
  v_public_price numeric;
  v_operator_fee numeric;
  v_platform_fee_owner numeric;
  v_owner_amount numeric;
BEGIN
  -- 1. Locker la cagnotte
  SELECT * INTO v_cagnotte
  FROM public.cagnotte
  WHERE id = p_cagnotte_id
  FOR UPDATE;
  
  -- 2. Vérifications
  IF v_cagnotte.collected_amount < v_cagnotte.total_amount THEN
    RAISE EXCEPTION 'Montant insuffisant pour confirmer (% / %)', 
      v_cagnotte.collected_amount, v_cagnotte.total_amount;
  END IF;
  
  IF v_cagnotte.status NOT IN ('IN_PROGRESS', 'HOLD') THEN
    RAISE EXCEPTION 'Statut invalide pour confirmation: %', v_cagnotte.status;
  END IF;
  
  -- 3. Vérifier que le slot est encore dispo
  IF NOT EXISTS (
    SELECT 1 FROM public.field_availability
    WHERE field_id = v_cagnotte.field_id
      AND date = v_cagnotte.slot_date
      AND start_time = v_cagnotte.slot_start_time
      AND is_available = true
  ) THEN
    RAISE EXCEPTION 'Le créneau n''est plus disponible';
  END IF;
  
  -- 4. Récupérer les infos du terrain
  SELECT * INTO v_field_record
  FROM public.fields
  WHERE id = v_cagnotte.field_id;
  
  -- 5. Calculer les montants selon la même logique que create-paydunya-invoice
  -- Le montant collecté est le finalTotal (prix public + frais opérateurs 3%)
  v_amount_checkout := v_cagnotte.collected_amount;
  v_public_price := ROUND(v_amount_checkout / 1.03);
  v_operator_fee := v_amount_checkout - v_public_price;
  v_platform_fee_owner := CEIL(v_public_price * 0.03);
  v_owner_amount := v_public_price - v_platform_fee_owner;
  
  -- 6. Créer la réservation dans bookings
  INSERT INTO public.bookings (
    field_id,
    user_id,
    booking_date,
    start_time,
    end_time,
    total_price,
    field_price,
    platform_fee_user,
    platform_fee_owner,
    owner_amount,
    status,
    payment_status,
    payment_provider,
    currency,
    paid_at,
    special_requests
  ) VALUES (
    v_cagnotte.field_id,
    v_cagnotte.created_by_user_id,
    v_cagnotte.slot_date,
    v_cagnotte.slot_start_time,
    v_cagnotte.slot_end_time,
    v_amount_checkout,
    v_public_price,
    v_operator_fee,
    v_platform_fee_owner,
    v_owner_amount,
    'confirmed',
    'paid',
    'paydunya',
    'XOF',
    now(),
    'Réservation via cagnotte équipe'
  )
  RETURNING id INTO v_booking_id;
  
  -- 7. Bloquer définitivement le slot
  UPDATE public.field_availability
  SET is_available = false,
      on_hold_until = NULL,
      hold_cagnotte_id = NULL
  WHERE field_id = v_cagnotte.field_id
    AND date = v_cagnotte.slot_date
    AND start_time = v_cagnotte.slot_start_time;
  
  -- 8. Mettre à jour la cagnotte
  UPDATE public.cagnotte
  SET status = 'CONFIRMED',
      updated_at = now()
  WHERE id = p_cagnotte_id;
  
  -- 9. Retourner les infos de la réservation
  RETURN jsonb_build_object(
    'success', true,
    'booking_id', v_booking_id,
    'captain_name', (SELECT full_name FROM public.profiles WHERE id = v_cagnotte.created_by_user_id),
    'field_name', v_field_record.name,
    'slot_date', v_cagnotte.slot_date,
    'slot_start_time', v_cagnotte.slot_start_time,
    'slot_end_time', v_cagnotte.slot_end_time
  );
END;
$$;

-- 9. Fonction de nettoyage des cagnottes expirées (Cron Job)
CREATE OR REPLACE FUNCTION public.cleanup_expired_cagnottes()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_expired_cagnottes record;
  v_expired_count integer := 0;
BEGIN
  -- 1. Sélectionner les cagnottes expirées
  FOR v_expired_cagnottes IN
    SELECT *
    FROM public.cagnotte
    WHERE status IN ('IN_PROGRESS', 'HOLD')
      AND (
        now() > expires_at
        OR (status = 'HOLD' AND now() > hold_expires_at AND collected_amount < total_amount)
      )
  LOOP
    v_expired_count := v_expired_count + 1;
    
    -- 2. Passer la cagnotte en EXPIRED
    UPDATE public.cagnotte
    SET status = 'EXPIRED',
        updated_at = now()
    WHERE id = v_expired_cagnottes.id;
    
    -- 3. Libérer le slot
    UPDATE public.field_availability
    SET on_hold_until = NULL,
        hold_cagnotte_id = NULL
    WHERE field_id = v_expired_cagnottes.field_id
      AND date = v_expired_cagnottes.slot_date
      AND start_time = v_expired_cagnottes.slot_start_time;
    
    -- 4. Marquer les contributions pour remboursement
    UPDATE public.cagnotte_contribution
    SET status = 'REFUND_PENDING',
        refund_initiated_at = now()
    WHERE cagnotte_id = v_expired_cagnottes.id
      AND status = 'SUCCEEDED';
    
    -- 5. Passer la cagnotte en REFUNDING
    UPDATE public.cagnotte
    SET status = 'REFUNDING'
    WHERE id = v_expired_cagnottes.id;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'expired_count', v_expired_count,
    'timestamp', now()
  );
END;
$$;