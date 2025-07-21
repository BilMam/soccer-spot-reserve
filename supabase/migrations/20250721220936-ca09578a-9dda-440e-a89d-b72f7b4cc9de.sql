-- Migration corrective simple pour les statuts de booking
-- Évite les conflits avec les triggers existants

-- Table de monitoring pour le CRON si pas encore créée
CREATE TABLE IF NOT EXISTS public.booking_cron_stats (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    run_at TIMESTAMPTZ DEFAULT now(),
    cleaned_count INTEGER NOT NULL DEFAULT 0,
    duration_ms INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS pour la table de monitoring
ALTER TABLE public.booking_cron_stats ENABLE ROW LEVEL SECURITY;

-- Politique pour permettre au système de gérer les stats
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'booking_cron_stats' 
        AND policyname = 'System can manage cron stats'
    ) THEN
        CREATE POLICY "System can manage cron stats"
        ON public.booking_cron_stats
        FOR ALL
        USING (true);
    END IF;
END $$;

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
  -- Désactiver temporairement les triggers pour éviter les conflits
  ALTER TABLE public.bookings DISABLE TRIGGER ALL;
  
  UPDATE public.bookings 
  SET 
    status = 'expired',
    payment_status = 'expired',
    updated_at = now()
  WHERE status = 'initiated'
    AND payment_status = 'pending'
    AND created_at < (now() - INTERVAL '15 minutes');
    
  GET DIAGNOSTICS cleaned_count = ROW_COUNT;
  
  -- Réactiver les triggers
  ALTER TABLE public.bookings ENABLE TRIGGER ALL;
  
  end_time := clock_timestamp();
  
  -- Enregistrer les stats de monitoring
  INSERT INTO public.booking_cron_stats(cleaned_count, duration_ms)
  VALUES (cleaned_count, EXTRACT(MILLISECOND FROM end_time - start_time)::int);
  
  -- Log pour debug
  RAISE NOTICE 'Nettoyage terminé: % réservations expirées en % ms', cleaned_count, EXTRACT(MILLISECOND FROM end_time - start_time);
END;
$function$;