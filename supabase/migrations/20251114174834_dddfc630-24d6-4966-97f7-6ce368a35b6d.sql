-- Fix double payout issue: Add optimistic lock in schedule_owner_payout

CREATE OR REPLACE FUNCTION public.schedule_owner_payout(p_booking_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  booking_record RECORD;
  owner_record RECORD;
  payout_exists BOOLEAN;
  v_request_id BIGINT;
BEGIN
  -- 1. Marquer IMMÉDIATEMENT le payout comme envoyé (verrou optimiste atomique)
  UPDATE public.bookings 
  SET payout_sent = TRUE
  WHERE id = p_booking_id 
    AND payout_sent = FALSE -- ✅ Condition atomique pour éviter double traitement
  RETURNING * INTO booking_record;
  
  -- Si l'UPDATE n'a rien modifié, c'est que payout_sent était déjà TRUE
  IF NOT FOUND THEN
    RAISE NOTICE '🛑 Payout déjà envoyé pour booking %', p_booking_id;
    RETURN;
  END IF;
  
  -- 2. Récupérer l'owner_id depuis le field
  SELECT f.owner_id INTO owner_record
  FROM public.fields f
  WHERE f.id = booking_record.field_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Field not found for booking %', p_booking_id;
  END IF;
  
  -- 3. Vérifier si payout existe déjà
  SELECT EXISTS(
    SELECT 1 FROM public.payouts 
    WHERE booking_id = p_booking_id
  ) INTO payout_exists;
  
  -- 4. Créer le payout record si nécessaire
  IF NOT payout_exists THEN
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
      owner_record.owner_id,
      booking_record.owner_amount,
      booking_record.owner_amount,
      booking_record.platform_fee_owner,
      'pending',
      NOW(),
      NOW()
    );
    
    RAISE NOTICE '✅ Payout record créé pour booking %', p_booking_id;
  END IF;
  
  -- 5. Appeler l'edge function via pg_net
  SELECT net.http_post(
    url := 'https://zldawmyoscicxoiqvfpu.supabase.co/functions/v1/create-paydunya-payout',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsZGF3bXlvc2NpY3hvaXF2ZnB1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk5MjY5NDAsImV4cCI6MjA2NTUwMjk0MH0.kKLUE9qwd4eCiegvGYvM3TKTPp8PuyycGp5L3wsUJu4'
    ),
    body := jsonb_build_object('booking_id', p_booking_id),
    timeout_milliseconds := 30000
  ) INTO v_request_id;
  
  RAISE NOTICE '✅ Payout edge function appelée - request_id: % pour booking: %', v_request_id, p_booking_id;
END;
$$;