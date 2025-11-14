-- Migration: Corriger confirm_cagnotte_and_lock_slot pour accepter le statut HOLD
-- Problème: La fonction refuse de confirmer les cagnottes en statut HOLD, bloquant la confirmation à 100%
-- Solution: Accepter les statuts IN_PROGRESS ET HOLD

CREATE OR REPLACE FUNCTION public.confirm_cagnotte_and_lock_slot(p_cagnotte_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_cagnotte RECORD;
  v_field_record RECORD;
  v_booking_id UUID;
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
    AND status IN ('IN_PROGRESS', 'HOLD')  -- ✅ Accepter les deux statuts
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
  
  -- 6.5. Déclencher le payout automatique pour le propriétaire
  PERFORM public.schedule_owner_payout(v_booking_id);
  
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