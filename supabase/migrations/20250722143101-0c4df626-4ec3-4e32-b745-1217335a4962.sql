-- Mettre à jour la fonction de nettoyage pour inclure les réservations provisoires abandonnées
CREATE OR REPLACE FUNCTION public.cleanup_expired_bookings()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  start_time timestamptz;
  end_time timestamptz;
  cleaned_count int := 0;
  cancelled_count int := 0;
  deleted_count int := 0;
BEGIN
  start_time := clock_timestamp();
  
  -- Désactiver temporairement les triggers
  ALTER TABLE public.bookings DISABLE TRIGGER ALL;
  
  -- Marquer comme expirées les tentatives de plus de 5 minutes (ancien système)
  UPDATE public.bookings 
  SET 
    status = 'expired',
    payment_status = 'expired',
    updated_at = now()
  WHERE status = 'initiated'
    AND payment_status = 'pending'
    AND created_at < (now() - INTERVAL '5 minutes');
    
  GET DIAGNOSTICS cleaned_count = ROW_COUNT;
  
  -- Annuler les réservations provisoires abandonnées après 15 minutes
  UPDATE public.bookings 
  SET 
    status = 'cancelled',
    payment_status = 'failed',
    cancellation_reason = 'Paiement abandonné - nettoyage automatique',
    updated_at = now()
  WHERE status = 'provisional'
    AND payment_status = 'pending'
    AND created_at < (now() - INTERVAL '15 minutes');
    
  GET DIAGNOSTICS cancelled_count = ROW_COUNT;
  
  -- Supprimer complètement les lignes expirées (après 1 minute de grâce)
  DELETE FROM public.bookings
  WHERE status = 'expired' 
    AND payment_status = 'expired'
    AND updated_at < (now() - INTERVAL '1 minute');
    
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Réactiver les triggers
  ALTER TABLE public.bookings ENABLE TRIGGER ALL;
  
  end_time := clock_timestamp();
  
  -- Stats incluant les nouvelles annulations
  INSERT INTO public.booking_cron_stats(cleaned_count, duration_ms)
  VALUES (cleaned_count + cancelled_count + deleted_count, EXTRACT(MILLISECOND FROM end_time - start_time)::int);
  
  RAISE NOTICE 'Nettoyage: % expirées, % annulées, % supprimées en % ms', 
    cleaned_count, cancelled_count, deleted_count, EXTRACT(MILLISECOND FROM end_time - start_time);
END;
$function$