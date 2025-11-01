-- Corriger la fonction create_cagnotte : restaurer la logique originale du preset_mode
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
  v_preset_mode TEXT;
  v_teama_target NUMERIC;
  v_teamb_target NUMERIC;
  v_timers JSONB;
  v_slot_datetime TIMESTAMPTZ;
  v_hold_threshold_pct NUMERIC;
  v_expires_at TIMESTAMPTZ;
  v_active_count INTEGER;
  v_hold_duration_sec INTEGER;
  v_collect_window_sec INTEGER;
  v_total_int NUMERIC;
BEGIN
  -- Validation des tailles d'équipes
  IF p_teama_size < 1 OR p_teama_size > 22 THEN
    RAISE EXCEPTION 'Équipe A : nombre de joueurs invalide (min 1, max 22)';
  END IF;
  
  IF p_teamb_size < 1 OR p_teamb_size > 22 THEN
    RAISE EXCEPTION 'Équipe B : nombre de joueurs invalide (min 1, max 22)';
  END IF;

  -- Anti-abus : vérifier le nombre de cagnottes actives
  SELECT COUNT(*) INTO v_active_count
  FROM public.cagnotte
  WHERE created_by_user_id = auth.uid()
    AND status IN ('IN_PROGRESS', 'HOLD');
    
  IF v_active_count >= 2 THEN
    RAISE EXCEPTION 'Tu as déjà 2 matchs en collecte. Attends qu''ils se finalisent.';
  END IF;

  -- Arrondir le montant total au supérieur (règle XOF)
  v_total_int := CEIL(p_total_amount);

  -- Vérifier disponibilité du créneau
  IF NOT EXISTS (
    SELECT 1 FROM public.field_availability
    WHERE field_id = p_field_id
      AND date = p_slot_date
      AND start_time = p_slot_start_time
      AND is_available = true
  ) THEN
    RAISE EXCEPTION 'Ce créneau n''est pas disponible';
  END IF;

  -- Récupérer le preset du terrain
  SELECT hold_preset_mode INTO v_preset_mode
  FROM public.fields
  WHERE id = p_field_id;

  -- Déterminer hold_threshold_pct selon le preset
  v_hold_threshold_pct := CASE v_preset_mode
    WHEN 'EXPRESS' THEN 60.00
    WHEN 'PROTECTEUR' THEN 40.00
    WHEN 'CONSERVATEUR' THEN 100.00
    ELSE 50.00  -- EQUILIBRE / AUTO
  END;

  -- Calculer les timers dynamiques
  v_slot_datetime := (p_slot_date + p_slot_start_time)::TIMESTAMPTZ;
  v_timers := public.calculate_cagnotte_timers(v_slot_datetime);
  
  v_hold_duration_sec := (v_timers->>'hold_duration_sec')::integer;
  v_collect_window_sec := (v_timers->>'collect_window_sec')::integer;
  v_expires_at := now() + v_collect_window_sec * interval '1 second';

  -- Calculer les targets (50/50 avec arrondi)
  v_teama_target := CEIL(v_total_int / 2);
  v_teamb_target := v_total_int - v_teama_target;

  -- Insérer la cagnotte avec toutes les colonnes
  INSERT INTO public.cagnotte (
    created_by_user_id,
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
    hold_duration_sec,
    collect_window_sec,
    expires_at,
    created_at,
    updated_at
  ) VALUES (
    auth.uid(),
    p_field_id,
    p_slot_date,
    p_slot_start_time,
    p_slot_end_time,
    v_total_int,
    0,
    v_teama_target,
    v_teamb_target,
    p_teama_size,
    p_teamb_size,
    'IN_PROGRESS',
    v_preset_mode,
    v_hold_threshold_pct,
    v_hold_duration_sec,
    v_collect_window_sec,
    v_expires_at,
    now(),
    now()
  )
  RETURNING id INTO v_cagnotte_id;

  -- Retourner les informations de la cagnotte créée
  RETURN json_build_object(
    'cagnotte_id', v_cagnotte_id,
    'status', 'IN_PROGRESS',
    'expires_at', v_expires_at,
    'teama_size', p_teama_size,
    'teamb_size', p_teamb_size,
    'teama_target', v_teama_target,
    'teamb_target', v_teamb_target,
    'preset_mode', v_preset_mode
  );
END;
$$;