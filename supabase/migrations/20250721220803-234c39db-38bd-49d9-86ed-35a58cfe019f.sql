-- Migration finale - Vérification et correction du workflow booking statuts

-- S'assurer que la fonction de nettoyage existe et fonctionne correctement
CREATE OR REPLACE FUNCTION public.cleanup_expired_bookings()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  start_time timestamptz;
  end_time timestamptz;
  cleaned_count int := 0;
BEGIN
  start_time := clock_timestamp();
  
  -- Marquer comme expirées les réservations initiées depuis plus de 15 minutes
  UPDATE public.bookings 
  SET 
    status = 'expired',
    payment_status = 'expired',
    updated_at = now()
  WHERE status = 'initiated'
    AND payment_status = 'pending'
    AND created_at < (now() - INTERVAL '15 minutes');
    
  GET DIAGNOSTICS cleaned_count = ROW_COUNT;
  end_time := clock_timestamp();
  
  -- Enregistrer les stats de monitoring
  INSERT INTO public.booking_cron_stats(cleaned_count, duration_ms)
  VALUES (cleaned_count, EXTRACT(MILLISECOND FROM end_time - start_time)::int);
  
  -- Log pour debug
  RAISE NOTICE 'Nettoyage terminé: % réservations expirées en % ms', cleaned_count, EXTRACT(MILLISECOND FROM end_time - start_time);
END;
$function$;

-- Table de monitoring si pas encore créée
CREATE TABLE IF NOT EXISTS public.booking_cron_stats (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    run_at TIMESTAMPTZ DEFAULT now(),
    cleaned_count INTEGER NOT NULL DEFAULT 0,
    duration_ms INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS pour la table de monitoring
ALTER TABLE public.booking_cron_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "System can manage cron stats"
ON public.booking_cron_stats
FOR ALL
USING (true);

-- Recréer le CRON job s'il n'existe pas
DO $$
BEGIN
    -- Supprimer les anciens jobs de nettoyage
    PERFORM cron.unschedule('cleanup-expired-bookings-old');
    PERFORM cron.unschedule('cleanup-expired-bookings');
    
    -- Créer le nouveau job CRON optimisé
    PERFORM cron.schedule(
        'cleanup-expired-bookings',
        '*/5 * * * *', -- Toutes les 5 minutes
        'SELECT public.cleanup_expired_bookings();'
    );
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Note: pg_cron extension peut ne pas être disponible en développement';
END $$;

-- Vérifier que les statuts de booking sont cohérents
UPDATE public.bookings 
SET status = 'initiated' 
WHERE status = 'pending' 
  AND payment_status = 'pending' 
  AND created_at > (now() - INTERVAL '15 minutes');

-- Les anciens "pending" de plus de 15 minutes deviennent "expired"
UPDATE public.bookings 
SET status = 'expired', payment_status = 'expired'
WHERE status = 'pending' 
  AND payment_status = 'pending' 
  AND created_at <= (now() - INTERVAL '15 minutes');