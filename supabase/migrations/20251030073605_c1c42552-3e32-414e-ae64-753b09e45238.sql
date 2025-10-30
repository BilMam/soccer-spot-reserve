-- Migration: Correctifs Cagnotte Équipe - HOLD range + vérif dispo + contrainte unique + dernier paiement

-- 1. Contrainte d'unicité plus précise (inclure slot_end_time)
DROP INDEX IF EXISTS unique_active_cagnotte_per_slot;

CREATE UNIQUE INDEX unique_active_cagnotte_per_slot 
ON public.cagnotte (field_id, slot_date, slot_start_time, slot_end_time) 
WHERE status IN ('IN_PROGRESS', 'HOLD');

-- 2. Fonction contribute_to_cagnotte : HOLD sur tout le range + dernier paiement < 3000
CREATE OR REPLACE FUNCTION public.contribute_to_cagnotte(
  p_cagnotte_id uuid, 
  p_amount numeric, 
  p_team text DEFAULT NULL::text, 
  p_method text DEFAULT 'MOMO'::text, 
  p_psp_tx_id text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
  v_remaining numeric;
  MIN_CONTRIBUTION constant numeric := 3000.00;
BEGIN
  -- 1. Locker la cagnotte (FOR UPDATE pour éviter les races)
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
  
  -- 4. Validation montant : autoriser dernier paiement < 3000 XOF
  v_remaining := v_cagnotte.total_amount - v_cagnotte.collected_amount;
  IF p_amount < MIN_CONTRIBUTION AND p_amount <> v_remaining THEN
    RAISE EXCEPTION 'Le montant minimum est de % XOF (sauf pour le dernier paiement)', MIN_CONTRIBUTION;
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
    
    -- Mettre le HOLD sur TOUTES les tranches du range
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
$function$;

-- 3. Fonction create_cagnotte : vérifier toutes les tranches
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
AS $function$
DECLARE
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
  
  -- 2. Vérifier que TOUTES les tranches du range sont disponibles
  IF EXISTS (
    SELECT 1 FROM public.field_availability
    WHERE field_id = p_field_id
      AND date = p_slot_date
      AND start_time >= p_slot_start_time
      AND start_time < p_slot_end_time
      AND (is_available = false OR (on_hold_until IS NOT NULL AND on_hold_until > now()))
  ) THEN
    RAISE EXCEPTION 'Ce créneau n''est pas disponible';
  END IF;
  
  -- 3. Vérifier qu'il n'y a pas déjà une réservation confirmée
  IF EXISTS (
    SELECT 1 FROM public.bookings
    WHERE field_id = p_field_id
      AND booking_date = p_slot_date
      AND start_time >= p_slot_start_time
      AND start_time < p_slot_end_time
      AND status IN ('confirmed', 'owner_confirmed', 'completed')
      AND payment_status = 'paid'
  ) THEN
    RAISE EXCEPTION 'Ce créneau est déjà réservé';
  END IF;
  
  -- 4. Récupérer le preset du terrain
  SELECT hold_preset_mode INTO v_preset_mode
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
  
  -- 7. Créer la cagnotte avec le montant fourni par le front
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
    p_total_amount,
    0,
    p_split_teama,
    p_split_teamb,
    p_total_amount * p_split_teama / 100,
    p_total_amount * p_split_teamb / 100,
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
    'total_amount', p_total_amount,
    'public_url', '/cagnotte/' || v_cagnotte_id
  );
END;
$function$;

-- 4. Fonction confirm_cagnotte_and_lock_slot : vérif range + gestion échec
CREATE OR REPLACE FUNCTION public.confirm_cagnotte_and_lock_slot(p_cagnotte_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
  
  -- 3. Vérifier que TOUTES les tranches du range sont encore dispo
  IF EXISTS (
    SELECT 1 FROM public.field_availability
    WHERE field_id = v_cagnotte.field_id
      AND date = v_cagnotte.slot_date
      AND start_time >= v_cagnotte.slot_start_time
      AND start_time < v_cagnotte.slot_end_time
      AND is_available = false
  ) THEN
    -- Slot plus dispo : passer en EXPIRED et rembourser
    UPDATE public.cagnotte
    SET status = 'EXPIRED',
        updated_at = now()
    WHERE id = p_cagnotte_id;
    
    UPDATE public.cagnotte_contribution
    SET status = 'REFUND_PENDING',
        refund_initiated_at = now()
    WHERE cagnotte_id = p_cagnotte_id
      AND status = 'SUCCEEDED';
    
    UPDATE public.field_availability
    SET on_hold_until = NULL,
        hold_cagnotte_id = NULL
    WHERE field_id = v_cagnotte.field_id
      AND date = v_cagnotte.slot_date
      AND start_time >= v_cagnotte.slot_start_time
      AND start_time < v_cagnotte.slot_end_time;
    
    UPDATE public.cagnotte
    SET status = 'REFUNDING'
    WHERE id = p_cagnotte_id;
    
    RAISE EXCEPTION 'Le créneau n''est plus disponible - remboursement lancé';
  END IF;
  
  -- 4. Récupérer les infos du terrain
  SELECT * INTO v_field_record
  FROM public.fields
  WHERE id = v_cagnotte.field_id;
  
  -- 5. Calculer les montants avec la MÊME logique que create-paydunya-invoice
  v_amount_checkout := v_cagnotte.total_amount;
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
  
  -- 7. Bloquer TOUTES les tranches horaires du range
  UPDATE public.field_availability
  SET is_available = false,
      on_hold_until = NULL,
      hold_cagnotte_id = NULL
  WHERE field_id = v_cagnotte.field_id
    AND date = v_cagnotte.slot_date
    AND start_time >= v_cagnotte.slot_start_time
    AND start_time < v_cagnotte.slot_end_time;
  
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
$function$;

-- 5. Supprimer les crons avec clé exposée (à remplacer par Supabase Functions Scheduled)
-- NOTE: Configurez plutôt via Supabase Dashboard > Functions > Scheduled
-- cleanup-cagnotte-cron : every 1 minute → appeler cleanup_expired_cagnottes()
-- process-cagnotte-refunds : every 2 minutes → appeler l'edge function

-- Si vous devez absolument utiliser pg_cron, utilisez current_setting ou Vault :
-- SELECT cron.unschedule('cleanup-expired-cagnottes');
-- SELECT cron.unschedule('process-cagnotte-refunds');