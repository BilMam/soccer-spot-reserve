-- Simplification complète du workflow de réservation
-- Plus de statut "initiated/pending" - uniquement confirmed ou cancelled
-- Nettoyage automatique renforcé

-- Mettre à jour get_field_bookings pour ne considérer que les réservations payées
CREATE OR REPLACE FUNCTION public.get_field_bookings(p_field_id uuid, p_start_date date, p_end_date date)
RETURNS TABLE(booking_date date, start_time time without time zone, end_time time without time zone, status text, payment_status text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    b.booking_date,
    b.start_time,
    b.end_time,
    b.status,
    b.payment_status
  FROM public.bookings b
  WHERE b.field_id = p_field_id
    AND b.booking_date >= p_start_date
    AND b.booking_date <= p_end_date
    -- SEULES LES RÉSERVATIONS CONFIRMÉES ET PAYÉES BLOQUENT LE CRÉNEAU
    AND b.status IN ('confirmed', 'owner_confirmed', 'completed')
    AND b.payment_status = 'paid'
  ORDER BY b.booking_date, b.start_time;
END;
$function$;

-- Mettre à jour check_slot_booking_status
CREATE OR REPLACE FUNCTION public.check_slot_booking_status(p_field_id uuid, p_date date, p_start_time time without time zone, p_end_time time without time zone)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.bookings
    WHERE field_id = p_field_id
      AND booking_date = p_date
      -- SEULES LES RÉSERVATIONS CONFIRMÉES ET PAYÉES BLOQUENT
      AND status IN ('confirmed', 'owner_confirmed', 'completed')
      AND payment_status = 'paid'
      AND start_time = p_start_time
      AND end_time = p_end_time
  );
END;
$function$;

-- Mettre à jour check_booking_conflict 
CREATE OR REPLACE FUNCTION public.check_booking_conflict(p_field_id uuid, p_booking_date date, p_start_time time without time zone, p_end_time time without time zone, p_booking_id uuid DEFAULT NULL::uuid)
RETURNS boolean
LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.bookings
    WHERE field_id = p_field_id
    AND booking_date = p_booking_date
    -- SEULES LES RÉSERVATIONS CONFIRMÉES CRÉENT UN CONFLIT
    AND status IN ('confirmed', 'owner_confirmed', 'completed')
    AND payment_status = 'paid'
    AND (p_booking_id IS NULL OR id != p_booking_id)
    AND (
      (start_time <= p_start_time AND end_time > p_start_time)
      OR (start_time < p_end_time AND end_time >= p_end_time)
      OR (start_time >= p_start_time AND end_time <= p_end_time)
    )
  );
END;
$function$;

-- Nettoyage renforcé : 5 minutes au lieu de 15, puis suppression pure
CREATE OR REPLACE FUNCTION public.cleanup_expired_bookings()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  start_time timestamptz;
  end_time timestamptz;
  cleaned_count int := 0;
  deleted_count int := 0;
BEGIN
  start_time := clock_timestamp();
  
  -- Désactiver temporairement les triggers
  ALTER TABLE public.bookings DISABLE TRIGGER ALL;
  
  -- Marquer comme expirées les tentatives de plus de 5 minutes
  UPDATE public.bookings 
  SET 
    status = 'expired',
    payment_status = 'expired',
    updated_at = now()
  WHERE status = 'initiated'
    AND payment_status = 'pending'
    AND created_at < (now() - INTERVAL '5 minutes');
    
  GET DIAGNOSTICS cleaned_count = ROW_COUNT;
  
  -- Supprimer complètement les lignes expirées (après 1 minute de grâce)
  DELETE FROM public.bookings
  WHERE status = 'expired' 
    AND payment_status = 'expired'
    AND updated_at < (now() - INTERVAL '1 minute');
    
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Réactiver les triggers
  ALTER TABLE public.bookings ENABLE TRIGGER ALL;
  
  end_time := clock_timestamp();
  
  -- Stats incluant les suppressions
  INSERT INTO public.booking_cron_stats(cleaned_count, duration_ms)
  VALUES (cleaned_count + deleted_count, EXTRACT(MILLISECOND FROM end_time - start_time)::int);
  
  RAISE NOTICE 'Nettoyage: % expirées, % supprimées en % ms', cleaned_count, deleted_count, EXTRACT(MILLISECOND FROM end_time - start_time);
END;
$function$;