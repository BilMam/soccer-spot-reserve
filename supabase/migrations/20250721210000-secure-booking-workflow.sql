-- Migration complète pour sécuriser définitivement le workflow "créneau bloqué après paiement"
-- Corrige les 4 points critiques identifiés et ajoute le monitoring

-- 1. Activer les extensions nécessaires pour le CRON
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Créer la table de monitoring pour les stats de nettoyage
CREATE TABLE IF NOT EXISTS public.booking_cron_stats (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  run_at timestamptz DEFAULT now(),
  cleaned_count int DEFAULT 0,
  duration_ms int DEFAULT 0
);

-- 3. Mettre à jour la fonction get_field_bookings pour ne considérer que les réservations confirmées
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
    -- NE CONSIDÉRER QUE LES RÉSERVATIONS RÉELLEMENT CONFIRMÉES
    AND b.status IN ('confirmed', 'owner_confirmed', 'completed')
    AND b.payment_status = 'paid'
  ORDER BY b.booking_date, b.start_time;
END;
$function$;

-- 4. Créer une fonction améliorée pour nettoyer les réservations expirées avec monitoring
CREATE OR REPLACE FUNCTION public.cleanup_expired_bookings()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  start_time timestamptz;
  end_time timestamptz;
  cleaned_count int := 0;
  duration_ms int;
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
  duration_ms := EXTRACT(MILLISECONDS FROM (end_time - start_time))::int;
  
  -- Enregistrer les statistiques de nettoyage
  INSERT INTO public.booking_cron_stats(cleaned_count, duration_ms)
  VALUES (cleaned_count, duration_ms);
    
  -- Log du nettoyage si la table booking_notifications existe
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'booking_notifications') AND cleaned_count > 0 THEN
    INSERT INTO public.booking_notifications (
      booking_id,
      notification_type,
      recipient_email,
      status,
      error_message
    )
    SELECT 
      id,
      'booking_expired',
      'system@soccerspot.com',
      'sent',
      'Booking automatically expired after 15 minutes'
    FROM public.bookings 
    WHERE status = 'expired' 
      AND updated_at > (now() - INTERVAL '1 minute');
  END IF;
END;
$function$;

-- 5. Créer un index pour optimiser la requête de nettoyage
CREATE INDEX IF NOT EXISTS idx_bookings_cleanup 
ON public.bookings(status, payment_status, created_at) 
WHERE status = 'initiated' AND payment_status = 'pending';

-- 6. Créer une contrainte unique pour éviter les double-réservations (seulement pour les réservations confirmées)
-- Supprimer l'ancienne contrainte si elle existe
DROP INDEX IF EXISTS unique_confirmed_booking_slot;

-- Créer la nouvelle contrainte qui ne s'applique qu'aux réservations confirmées et payées
CREATE UNIQUE INDEX unique_confirmed_booking_slot 
ON public.bookings(field_id, booking_date, start_time, end_time) 
WHERE status IN ('confirmed', 'owner_confirmed', 'completed') 
  AND payment_status = 'paid';

-- 7. Programmer la tâche de nettoyage automatique toutes les 5 minutes (directement via fonction SQL)
SELECT cron.schedule(
  'cleanup-expired-bookings',
  '*/5 * * * *', -- Toutes les 5 minutes
  $$
  SELECT public.cleanup_expired_bookings();
  $$
);

-- 8. RLS pour la table de monitoring
ALTER TABLE public.booking_cron_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "System can manage cron stats" ON public.booking_cron_stats
FOR ALL USING (true);

-- Permettre aux admins de voir les stats
CREATE POLICY "Admins can view cron stats" ON public.booking_cron_stats
FOR SELECT USING (
  has_role(auth.uid(), 'super_admin'::user_role_type) OR 
  has_role(auth.uid(), 'admin_general'::user_role_type)
);

-- 9. Commenter/documenter les changements
COMMENT ON FUNCTION public.get_field_bookings(uuid, date, date) IS 
'Retourne uniquement les réservations confirmées et payées pour éviter que les tentatives de paiement bloquent les créneaux';

COMMENT ON FUNCTION public.cleanup_expired_bookings() IS 
'Nettoie automatiquement les réservations initiées mais jamais confirmées après 15 minutes avec monitoring intégré';

COMMENT ON INDEX unique_confirmed_booking_slot IS 
'Contrainte d''unicité qui ne s''applique qu''aux réservations réellement confirmées et payées';

COMMENT ON TABLE public.booking_cron_stats IS 
'Table de monitoring pour suivre les performances du nettoyage automatique des réservations expirées';