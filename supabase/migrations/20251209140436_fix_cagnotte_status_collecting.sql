-- Correction du bug: le statut 'collecting' n'existe pas dans la contrainte CHECK
-- Le bon statut est 'IN_PROGRESS' (et 'HOLD' en majuscules)

CREATE OR REPLACE FUNCTION public.create_cagnotte(
  p_field_id UUID,
  p_slot_date DATE,
  p_slot_start_time TIME,
  p_slot_end_time TIME,
  p_total_amount NUMERIC,
  p_teama_size INTEGER DEFAULT 5,
  p_teamb_size INTEGER DEFAULT 5,
  p_teama_name TEXT DEFAULT 'Équipe A',
  p_teamb_name TEXT DEFAULT 'Équipe B'
) RETURNS JSON AS $$
DECLARE
  v_cagnotte_id UUID;
  v_field_preset TEXT;
  v_collect_window INTEGER;
  v_hold_duration INTEGER;
  v_hold_threshold NUMERIC;
  v_expires_at TIMESTAMPTZ;
  v_slot_datetime TIMESTAMPTZ;
  v_timers JSON;
  v_total_players INTEGER;
  v_teama_target NUMERIC;
  v_teamb_target NUMERIC;
  v_split_teama NUMERIC;
  v_split_teamb NUMERIC;
BEGIN
  -- Vérifier que le créneau n'est pas déjà réservé (sans cast ::text)
  IF public.check_slot_booking_status(p_field_id, p_slot_date, p_slot_start_time, p_slot_end_time) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'SLOT_ALREADY_BOOKED',
      'message', 'Ce créneau est déjà réservé'
    );
  END IF;

  -- Vérifier qu'il n'y a pas déjà une cagnotte active pour ce créneau
  -- Utiliser les bons statuts: IN_PROGRESS et HOLD (majuscules)
  IF EXISTS (
    SELECT 1 FROM public.cagnotte
    WHERE field_id = p_field_id
      AND slot_date = p_slot_date
      AND slot_start_time = p_slot_start_time
      AND slot_end_time = p_slot_end_time
      AND status IN ('IN_PROGRESS', 'HOLD')
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'CAGNOTTE_ALREADY_EXISTS',
      'message', 'Une cagnotte existe déjà pour ce créneau'
    );
  END IF;

  -- Récupérer le preset du terrain
  SELECT hold_preset_mode INTO v_field_preset
  FROM public.fields
  WHERE id = p_field_id;

  IF v_field_preset IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'FIELD_NOT_FOUND',
      'message', 'Terrain non trouvé'
    );
  END IF;

  -- Calculer les timers basés sur le preset et la date/heure du créneau
  v_slot_datetime := (p_slot_date || ' ' || p_slot_start_time)::TIMESTAMPTZ;
  v_timers := public.calculate_cagnotte_timers(v_slot_datetime::TEXT);

  v_collect_window := (v_timers->>'collect_window_sec')::INTEGER;
  v_hold_duration := (v_timers->>'hold_duration_sec')::INTEGER;
  v_hold_threshold := (v_timers->>'hold_threshold_pct')::NUMERIC;
  v_expires_at := NOW() + (v_collect_window || ' seconds')::INTERVAL;

  -- Calculer les parts des équipes basées sur le nombre de joueurs
  v_total_players := p_teama_size + p_teamb_size;
  v_split_teama := ROUND((p_teama_size::NUMERIC / v_total_players::NUMERIC) * 100, 2);
  v_split_teamb := ROUND((p_teamb_size::NUMERIC / v_total_players::NUMERIC) * 100, 2);
  v_teama_target := ROUND(p_total_amount * (v_split_teama / 100), 0);
  v_teamb_target := ROUND(p_total_amount * (v_split_teamb / 100), 0);

  -- Créer la cagnotte avec le bon statut IN_PROGRESS
  INSERT INTO public.cagnotte (
    field_id,
    slot_date,
    slot_start_time,
    slot_end_time,
    total_amount,
    collected_amount,
    status,
    preset_mode,
    collect_window_sec,
    hold_duration_sec,
    hold_threshold_pct,
    expires_at,
    teama_size,
    teamb_size,
    teama_name,
    teamb_name,
    teama_target,
    teamb_target,
    split_pct_teama,
    split_pct_teamb,
    created_by_user_id
  ) VALUES (
    p_field_id,
    p_slot_date,
    p_slot_start_time,
    p_slot_end_time,
    p_total_amount,
    0,
    'IN_PROGRESS',  -- Correction: était 'collecting' qui n'existe pas
    v_field_preset,
    v_collect_window,
    v_hold_duration,
    v_hold_threshold,
    v_expires_at,
    p_teama_size,
    p_teamb_size,
    COALESCE(NULLIF(TRIM(p_teama_name), ''), 'Équipe A'),
    COALESCE(NULLIF(TRIM(p_teamb_name), ''), 'Équipe B'),
    v_teama_target,
    v_teamb_target,
    v_split_teama,
    v_split_teamb,
    auth.uid()
  )
  RETURNING id INTO v_cagnotte_id;

  RETURN json_build_object(
    'success', true,
    'cagnotte_id', v_cagnotte_id,
    'expires_at', v_expires_at,
    'collect_window_sec', v_collect_window,
    'hold_duration_sec', v_hold_duration,
    'hold_threshold_pct', v_hold_threshold,
    'teama_target', v_teama_target,
    'teamb_target', v_teamb_target,
    'split_teama', v_split_teama,
    'split_teamb', v_split_teamb
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
