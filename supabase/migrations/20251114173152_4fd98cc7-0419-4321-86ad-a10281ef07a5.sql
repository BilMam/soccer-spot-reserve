-- Migration: Corriger le calcul des montants pour les cagnottes équipe
-- Problème: Le propriétaire ne reçoit pas exactement son net_price configuré
-- Solution: Récupérer le net_price directement du terrain et déclencher le payout immédiatement

-- 1. Activer l'extension pg_net pour les appels HTTP
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Modifier confirm_cagnotte_and_lock_slot pour utiliser le net_price du terrain
CREATE OR REPLACE FUNCTION public.confirm_cagnotte_and_lock_slot(p_cagnotte_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_cagnotte RECORD;
  v_field_record RECORD;
  v_booking_id UUID;
  v_duration_minutes INTEGER;
  v_net_price_owner NUMERIC;
  v_amount_checkout NUMERIC;
  v_public_price NUMERIC;
  v_operator_fee NUMERIC;
  v_platform_fee_owner NUMERIC;
  v_owner_amount NUMERIC;
BEGIN
  -- 1. Bloquer la cagnotte et vérifier son éligibilité
  SELECT * INTO v_cagnotte
  FROM public.cagnotte
  WHERE id = p_cagnotte_id
    AND status IN ('IN_PROGRESS', 'HOLD')
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cagnotte introuvable ou déjà confirmée';
  END IF;
  
  -- 2. Vérifier que le montant collecté >= total_amount
  IF v_cagnotte.collected_amount < v_cagnotte.total_amount THEN
    RAISE EXCEPTION 'Montant collecté insuffisant: % < %', v_cagnotte.collected_amount, v_cagnotte.total_amount;
  END IF;
  
  -- 3. Vérifier disponibilité du créneau
  IF EXISTS (
    SELECT 1 FROM public.bookings
    WHERE field_id = v_cagnotte.field_id
      AND booking_date = v_cagnotte.slot_date
      AND start_time < v_cagnotte.slot_end_time
      AND end_time > v_cagnotte.slot_start_time
      AND status IN ('pending', 'confirmed')
  ) THEN
    UPDATE public.cagnotte
    SET status = 'CANCELLED',
        cancellation_reason = 'Créneau déjà réservé - remboursement en cours',
        updated_at = now()
    WHERE id = p_cagnotte_id;
    
    RAISE EXCEPTION 'Le créneau n''est plus disponible - remboursement lancé';
  END IF;
  
  -- 4. Récupérer les infos du terrain
  SELECT * INTO v_field_record
  FROM public.fields
  WHERE id = v_cagnotte.field_id;
  
  -- 5. Calculer la durée de réservation
  v_duration_minutes := EXTRACT(EPOCH FROM (v_cagnotte.slot_end_time - v_cagnotte.slot_start_time)) / 60;
  
  -- 6. Récupérer le NET_PRICE du terrain selon la durée (MÊME LOGIQUE que create-paydunya-invoice)
  IF v_duration_minutes = 60 THEN
    v_net_price_owner := v_field_record.net_price_1h;
  ELSIF v_duration_minutes = 90 THEN
    v_net_price_owner := COALESCE(v_field_record.net_price_1h30, v_field_record.net_price_1h);
  ELSIF v_duration_minutes = 120 THEN
    v_net_price_owner := COALESCE(v_field_record.net_price_2h, v_field_record.net_price_1h);
  ELSE
    -- Proportionnel pour durées personnalisées
    v_net_price_owner := FLOOR(v_field_record.net_price_1h * (v_duration_minutes / 60.0));
  END IF;
  
  -- 7. Le propriétaire touche EXACTEMENT son net_price (comme une réservation normale)
  v_owner_amount := FLOOR(v_net_price_owner);
  
  -- 8. Calculer les autres montants À PARTIR du total_amount de la cagnotte
  v_amount_checkout := v_cagnotte.total_amount;
  v_public_price := ROUND(v_amount_checkout / 1.03);
  v_operator_fee := v_amount_checkout - v_public_price;
  v_platform_fee_owner := v_public_price - v_owner_amount;
  
  -- 9. Créer la réservation dans bookings
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
  
  -- 10. Déclencher le payout automatique pour le propriétaire
  PERFORM public.schedule_owner_payout(v_booking_id);
  
  -- 11. Bloquer TOUTES les tranches horaires du range
  UPDATE public.field_availability
  SET is_available = false,
      on_hold_until = NULL,
      hold_cagnotte_id = NULL
  WHERE field_id = v_cagnotte.field_id
    AND date = v_cagnotte.slot_date
    AND start_time >= v_cagnotte.slot_start_time
    AND start_time < v_cagnotte.slot_end_time;
  
  -- 12. Mettre à jour la cagnotte
  UPDATE public.cagnotte
  SET status = 'CONFIRMED',
      updated_at = now()
  WHERE id = p_cagnotte_id;
  
  -- 13. Retourner les infos de la réservation
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

-- 3. Modifier schedule_owner_payout pour déclencher immédiatement le payout via pg_net
CREATE OR REPLACE FUNCTION public.schedule_owner_payout(p_booking_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  booking_record RECORD;
  owner_record RECORD;
  payout_exists BOOLEAN;
  v_request_id BIGINT;
BEGIN
  -- Vérifier si un payout existe déjà (idempotence)
  SELECT EXISTS(
    SELECT 1 FROM public.payouts 
    WHERE booking_id = p_booking_id
  ) INTO payout_exists;
  
  IF payout_exists THEN
    RETURN; -- Payout déjà créé
  END IF;
  
  -- Récupérer les détails de la réservation
  SELECT b.*, f.owner_id
  INTO booking_record
  FROM public.bookings b
  JOIN public.fields f ON b.field_id = f.id
  WHERE b.id = p_booking_id
    AND b.payment_status = 'paid'
    AND b.payout_sent = FALSE;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  -- Créer le payout en attente
  INSERT INTO public.payouts (
    booking_id,
    owner_id,
    amount,
    amount_net,
    platform_fee_owner,
    status,
    created_at,
    updated_at
  ) VALUES (
    p_booking_id,
    booking_record.owner_id,
    booking_record.owner_amount,
    booking_record.owner_amount,
    booking_record.platform_fee_owner,
    'pending',
    NOW(),
    NOW()
  );
  
  -- Marquer comme traité pour éviter les doublons
  UPDATE public.bookings 
  SET payout_sent = TRUE
  WHERE id = p_booking_id;
  
  -- ✅ NOUVEAU: Appeler immédiatement l'edge function create-paydunya-payout via pg_net
  SELECT net.http_post(
    url := 'https://zldawmyoscicxoiqvfpu.supabase.co/functions/v1/create-paydunya-payout',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsZGF3bXlvc2NpY3hvaXF2ZnB1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk5MjY5NDAsImV4cCI6MjA2NTUwMjk0MH0.kKLUE9qwd4eCiegvGYvM3TKTPp8PuyycGp5L3wsUJu4'
    ),
    body := jsonb_build_object(
      'booking_id', p_booking_id
    ),
    timeout_milliseconds := 30000
  ) INTO v_request_id;
  
  RAISE NOTICE '✅ Payout edge function appelée immédiatement - request_id: % pour booking: %', v_request_id, p_booking_id;
END;
$function$;