-- Ajouter les colonnes pour les noms d'équipes personnalisés
ALTER TABLE public.cagnotte 
ADD COLUMN IF NOT EXISTS teama_name TEXT DEFAULT 'Équipe A',
ADD COLUMN IF NOT EXISTS teamb_name TEXT DEFAULT 'Équipe B';

-- Mettre à jour la fonction create_cagnotte pour accepter les noms d'équipes
CREATE OR REPLACE FUNCTION public.create_cagnotte(
  p_field_id uuid,
  p_slot_date date,
  p_slot_start_time time,
  p_slot_end_time time,
  p_total_amount numeric,
  p_teama_size integer DEFAULT 8,
  p_teamb_size integer DEFAULT 8,
  p_teama_name text DEFAULT 'Équipe A',
  p_teamb_name text DEFAULT 'Équipe B'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cagnotte_id uuid;
  v_field record;
  v_timers json;
  v_expires_at timestamptz;
  v_teama_target numeric;
  v_teamb_target numeric;
  v_slot_datetime timestamptz;
BEGIN
  -- Vérifier que le terrain existe et récupérer ses infos
  SELECT * INTO v_field FROM fields WHERE id = p_field_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Terrain non trouvé');
  END IF;

  -- Construire le datetime du slot
  v_slot_datetime := (p_slot_date::text || ' ' || p_slot_start_time::text)::timestamptz;

  -- Calculer les timers selon le preset du terrain
  v_timers := calculate_cagnotte_timers(v_slot_datetime);

  -- Calculer expires_at
  v_expires_at := now() + ((v_timers->>'collect_window_sec')::integer * interval '1 second');

  -- Calculer les targets pour chaque équipe (50/50)
  v_teama_target := p_total_amount / 2;
  v_teamb_target := p_total_amount / 2;

  -- Vérifier qu'il n'y a pas déjà une cagnotte active pour ce slot
  IF EXISTS (
    SELECT 1 FROM cagnotte 
    WHERE field_id = p_field_id 
    AND slot_date = p_slot_date 
    AND slot_start_time = p_slot_start_time
    AND status IN ('IN_PROGRESS', 'HOLD', 'CONFIRMED')
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Une cagnotte existe déjà pour ce créneau');
  END IF;

  -- Vérifier que le slot n'est pas déjà réservé
  IF check_slot_booking_status(p_field_id, p_slot_date, p_slot_start_time::text, p_slot_end_time::text) THEN
    RETURN json_build_object('success', false, 'error', 'Ce créneau est déjà réservé');
  END IF;

  -- Créer la cagnotte
  INSERT INTO cagnotte (
    field_id,
    slot_date,
    slot_start_time,
    slot_end_time,
    total_amount,
    collected_amount,
    status,
    created_by_user_id,
    expires_at,
    collect_window_sec,
    hold_duration_sec,
    hold_threshold_pct,
    preset_mode,
    teama_size,
    teamb_size,
    teama_target,
    teamb_target,
    split_pct_teama,
    split_pct_teamb,
    teama_name,
    teamb_name
  ) VALUES (
    p_field_id,
    p_slot_date,
    p_slot_start_time,
    p_slot_end_time,
    p_total_amount,
    0,
    'IN_PROGRESS',
    auth.uid(),
    v_expires_at,
    (v_timers->>'collect_window_sec')::integer,
    (v_timers->>'hold_duration_sec')::integer,
    (v_timers->>'hold_threshold_pct')::numeric,
    v_field.hold_preset_mode,
    p_teama_size,
    p_teamb_size,
    v_teama_target,
    v_teamb_target,
    50,
    50,
    COALESCE(NULLIF(TRIM(p_teama_name), ''), 'Équipe A'),
    COALESCE(NULLIF(TRIM(p_teamb_name), ''), 'Équipe B')
  )
  RETURNING id INTO v_cagnotte_id;

  -- Mettre le slot en hold
  UPDATE field_availability
  SET 
    is_available = false,
    hold_cagnotte_id = v_cagnotte_id,
    on_hold_until = v_expires_at,
    unavailability_reason = 'cagnotte_hold'
  WHERE field_id = p_field_id
    AND date = p_slot_date
    AND start_time <= p_slot_start_time
    AND end_time >= p_slot_end_time;

  RETURN json_build_object(
    'success', true,
    'cagnotte_id', v_cagnotte_id,
    'expires_at', v_expires_at,
    'teama_target', v_teama_target,
    'teamb_target', v_teamb_target,
    'teama_name', COALESCE(NULLIF(TRIM(p_teama_name), ''), 'Équipe A'),
    'teamb_name', COALESCE(NULLIF(TRIM(p_teamb_name), ''), 'Équipe B')
  );
END;
$$;