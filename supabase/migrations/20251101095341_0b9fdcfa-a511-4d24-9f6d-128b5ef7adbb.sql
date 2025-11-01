-- Mettre à jour la fonction create_cagnotte pour accepter les tailles d'équipes
CREATE OR REPLACE FUNCTION public.create_cagnotte(
  p_field_id UUID,
  p_slot_date DATE,
  p_slot_start_time TIME,
  p_slot_end_time TIME,
  p_total_amount NUMERIC,
  p_teama_size INTEGER DEFAULT 8,
  p_teamb_size INTEGER DEFAULT 8
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_cagnotte_id UUID;
  v_preset_mode TEXT := 'PAY2WIN';
  v_teama_target NUMERIC;
  v_teamb_target NUMERIC;
  v_timers JSONB;
  v_slot_datetime TIMESTAMPTZ;
  v_hold_threshold_pct INTEGER := 80;
  v_expires_at TIMESTAMPTZ;
  v_active_count INTEGER;
BEGIN
  -- Validation des tailles d'équipes
  IF p_teama_size < 1 OR p_teama_size > 22 THEN
    RAISE EXCEPTION 'Équipe A : nombre de joueurs invalide (min 1, max 22)';
  END IF;
  
  IF p_teamb_size < 1 OR p_teamb_size > 22 THEN
    RAISE EXCEPTION 'Équipe B : nombre de joueurs invalide (min 1, max 22)';
  END IF;

  -- Vérifier que l'utilisateur n'a pas déjà 2 cagnottes actives
  SELECT COUNT(*) INTO v_active_count
  FROM public.cagnotte
  WHERE captain_id = auth.uid()
    AND status IN ('IN_PROGRESS', 'HOLD');
    
  IF v_active_count >= 2 THEN
    RAISE EXCEPTION 'Tu as déjà 2 matchs en collecte. Attends qu''ils se finalisent.';
  END IF;

  -- Vérifier que le créneau existe et est disponible
  IF NOT EXISTS (
    SELECT 1 FROM public.field_availability
    WHERE field_id = p_field_id
      AND date = p_slot_date
      AND start_time = p_slot_start_time
      AND is_available = true
  ) THEN
    RAISE EXCEPTION 'Ce créneau n''est pas disponible';
  END IF;

  -- Calculer les targets (50/50)
  v_teama_target := p_total_amount / 2;
  v_teamb_target := p_total_amount / 2;

  -- Calculer les timers
  v_slot_datetime := (p_slot_date + p_slot_start_time)::TIMESTAMPTZ;
  v_timers := public.calculate_cagnotte_timers(v_slot_datetime);
  v_expires_at := now() + (v_timers->>'expires_in_sec')::integer * interval '1 second';

  -- Insérer la cagnotte avec les tailles d'équipes
  INSERT INTO public.cagnotte (
    captain_id,
    field_id,
    slot_date,
    slot_start_time,
    slot_end_time,
    total_amount,
    collected_amount,
    teama_target,
    teamb_target,
    teama_size,
    teamb_size,
    status,
    preset_mode,
    hold_threshold_pct,
    expires_at,
    created_at,
    updated_at
  ) VALUES (
    auth.uid(),
    p_field_id,
    p_slot_date,
    p_slot_start_time,
    p_slot_end_time,
    p_total_amount,
    0,
    v_teama_target,
    v_teamb_target,
    p_teama_size,
    p_teamb_size,
    'IN_PROGRESS',
    v_preset_mode,
    v_hold_threshold_pct,
    v_expires_at,
    now(),
    now()
  )
  RETURNING id INTO v_cagnotte_id;

  RETURN json_build_object(
    'cagnotte_id', v_cagnotte_id,
    'status', 'IN_PROGRESS',
    'expires_at', v_expires_at,
    'teama_size', p_teama_size,
    'teamb_size', p_teamb_size
  );
END;
$$;