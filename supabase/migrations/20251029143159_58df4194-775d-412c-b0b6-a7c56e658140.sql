-- Finalisation feature Cagnotte Équipe

-- 1. Modifier calculate_cagnotte_timers pour être STABLE au lieu de IMMUTABLE
DROP FUNCTION IF EXISTS public.calculate_cagnotte_timers(timestamptz);

CREATE OR REPLACE FUNCTION public.calculate_cagnotte_timers(slot_datetime timestamptz)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
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
    collect_window_sec := 3600;  -- 60 min
  ELSIF hours_until_slot > 24 THEN
    hold_duration_sec := 600;  -- 10 min
    collect_window_sec := 2700;  -- 45 min
  ELSIF hours_until_slot > 6 THEN
    hold_duration_sec := 480;  -- 8 min
    collect_window_sec := 1800;  -- 30 min
  ELSIF hours_until_slot > 2 THEN
    hold_duration_sec := 420;  -- 7 min
    collect_window_sec := 1200;  -- 20 min
  ELSIF hours_until_slot > 1 THEN
    hold_duration_sec := 300;  -- 5 min
    collect_window_sec := 900;   -- 15 min
  ELSE
    hold_duration_sec := 120;  -- 2 min
    collect_window_sec := 600;   -- 10 min
  END IF;
  
  RETURN jsonb_build_object(
    'hold_duration_sec', hold_duration_sec,
    'collect_window_sec', collect_window_sec
  );
END;
$$;

-- 2. Modifier create_cagnotte pour accepter p_total_amount
DROP FUNCTION IF EXISTS public.create_cagnotte(uuid, date, time, time, numeric, numeric);

CREATE OR REPLACE FUNCTION public.create_cagnotte(
  p_field_id uuid,
  p_slot_date date,
  p_slot_start_time time,
  p_slot_end_time time,
  p_total_amount numeric,
  p_split_teama numeric DEFAULT 50.00,
  p_split_teamb numeric DEFAULT 50.00
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
    p_total_amount,  -- Montant fourni par le front
    0,
    p_split_teamA,
    p_split_teamB,
    p_total_amount * p_split_teamA / 100,
    p_total_amount * p_split_teamB / 100,
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
$$;

-- 3. Recréer confirm_cagnotte_and_lock_slot avec la logique de pricing correcte
DROP FUNCTION IF EXISTS public.confirm_cagnotte_and_lock_slot(uuid);

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
      AND start_time >= v_cagnotte.slot_start_time
      AND start_time < v_cagnotte.slot_end_time
      AND is_available = true
    LIMIT 1
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
  -- Le total_amount de la cagnotte est le finalTotal (prix public + frais opérateurs 3%)
  v_amount_checkout := v_cagnotte.total_amount;
  
  -- Prix public = finalTotal / 1.03
  v_public_price := ROUND(v_amount_checkout / 1.03);
  
  -- Frais opérateur = finalTotal - prix public
  v_operator_fee := v_amount_checkout - v_public_price;
  
  -- Commission plateforme propriétaire = 3% du prix public
  v_platform_fee_owner := CEIL(v_public_price * 0.03);
  
  -- Montant net propriétaire = prix public - commission
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
  
  -- 7. Bloquer TOUTES les tranches horaires du créneau
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
$$;

-- 4. Ajouter la contrainte d'unicité sur les cagnottes actives
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'unique_active_cagnotte_per_slot'
  ) THEN
    CREATE UNIQUE INDEX unique_active_cagnotte_per_slot
    ON public.cagnotte (field_id, slot_date, slot_start_time)
    WHERE status IN ('IN_PROGRESS', 'HOLD');
  END IF;
END $$;

-- 5. Configurer les crons Supabase
SELECT cron.schedule(
  'cleanup-expired-cagnottes',
  '* * * * *',
  $$
    SELECT public.cleanup_expired_cagnottes();
  $$
);

SELECT cron.schedule(
  'process-cagnotte-refunds',
  '*/2 * * * *',
  $$
    SELECT net.http_post(
      url := 'https://zldawmyoscicxoiqvfpu.supabase.co/functions/v1/process-cagnotte-refunds',
      headers := jsonb_build_object(
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsZGF3bXlvc2NpY3hvaXF2ZnB1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk5MjY5NDAsImV4cCI6MjA2NTUwMjk0MH0.kKLUE9qwd4eCiegvGYvM3TKTPp8PuyycGp5L3wsUJu4',
        'Content-Type', 'application/json'
      )
    ) AS request_id;
  $$
);