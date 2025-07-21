
-- 1. Mise à jour du modèle de données pour le workflow simplifié
-- Supprimer les anciens index et contraintes
DROP INDEX IF EXISTS unique_confirmed_booking_slot;
DROP INDEX IF EXISTS unique_slot_if_confirmed;

-- Créer l'index d'unicité conditionnel pour éviter les double-réservations
CREATE UNIQUE INDEX unique_slot_if_confirmed
ON public.bookings(field_id, booking_date, start_time, end_time)
WHERE status = 'confirmed';

-- Mettre à jour les réservations existantes pour le nouveau workflow
UPDATE public.bookings 
SET 
  status = CASE 
    WHEN status = 'initiated' THEN 'provisional'
    WHEN status = 'pending' THEN 'provisional'
    WHEN status = 'confirmed' THEN 'confirmed'
    WHEN status = 'owner_confirmed' THEN 'confirmed'
    WHEN status = 'completed' THEN 'completed'
    WHEN status = 'cancelled' THEN 'cancelled'
    WHEN status = 'failed' THEN 'cancelled'
    WHEN status = 'expired' THEN 'cancelled'
    WHEN status = 'refunded' THEN 'cancelled'
    ELSE 'cancelled'
  END,
  payment_status = CASE 
    WHEN payment_status = 'pending' THEN 'pending'
    WHEN payment_status = 'paid' THEN 'paid'
    WHEN payment_status = 'failed' THEN 'failed'
    WHEN payment_status = 'expired' THEN 'failed'
    ELSE 'failed'
  END,
  updated_at = now()
WHERE status IN ('initiated', 'pending', 'owner_confirmed', 'failed', 'expired', 'refunded');

-- Mise à jour de la fonction de nettoyage
CREATE OR REPLACE FUNCTION public.cleanup_expired_bookings()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  start_time timestamptz;
  end_time timestamptz;
  updated_count int := 0;
  deleted_count int := 0;
BEGIN
  start_time := clock_timestamp();
  
  -- Désactiver temporairement les triggers
  ALTER TABLE public.bookings DISABLE TRIGGER ALL;
  
  -- Marquer comme cancelled/failed les tentatives provisoires de plus de 15 minutes
  UPDATE public.bookings 
  SET 
    status = 'cancelled',
    payment_status = 'failed',
    updated_at = now()
  WHERE status = 'provisional'
    AND payment_status = 'pending'
    AND created_at < (now() - INTERVAL '15 minutes');
    
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  -- Supprimer complètement les lignes cancelled/failed de plus de 1 minute
  DELETE FROM public.bookings
  WHERE status = 'cancelled' 
    AND payment_status = 'failed'
    AND updated_at < (now() - INTERVAL '1 minute');
    
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Réactiver les triggers
  ALTER TABLE public.bookings ENABLE TRIGGER ALL;
  
  end_time := clock_timestamp();
  
  -- Stats incluant les suppressions
  INSERT INTO public.booking_cron_stats(cleaned_count, duration_ms)
  VALUES (updated_count + deleted_count, EXTRACT(MILLISECOND FROM end_time - start_time)::int);
  
  RAISE NOTICE 'Nettoyage: % provisoires expirées, % supprimées en % ms', updated_count, deleted_count, EXTRACT(MILLISECOND FROM end_time - start_time);
END;
$function$;

-- Mise à jour de la fonction de vérification de conflit
CREATE OR REPLACE FUNCTION public.check_booking_conflict(p_field_id uuid, p_booking_date date, p_start_time time without time zone, p_end_time time without time zone, p_booking_id uuid DEFAULT NULL::uuid)
RETURNS boolean
LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.bookings
    WHERE field_id = p_field_id
    AND booking_date = p_booking_date
    -- SEULES LES RÉSERVATIONS CONFIRMÉES ET PAYÉES CRÉENT UN CONFLIT
    AND status = 'confirmed'
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

-- Mise à jour de la fonction de vérification du statut de slot
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
      AND status = 'confirmed'
      AND payment_status = 'paid'
      AND start_time = p_start_time
      AND end_time = p_end_time
  );
END;
$function$;

-- Mise à jour de la fonction de récupération des réservations
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
    AND b.status = 'confirmed'
    AND b.payment_status = 'paid'
  ORDER BY b.booking_date, b.start_time;
END;
$function$;

-- Création de la table pour le monitoring des anomalies de paiement
CREATE TABLE IF NOT EXISTS public.payment_anomalies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_intent_id text NOT NULL,
  amount integer,
  currency text DEFAULT 'XOF',
  error_type text NOT NULL,
  error_message text,
  webhook_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS pour la table payment_anomalies
ALTER TABLE public.payment_anomalies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "System can manage payment anomalies"
ON public.payment_anomalies
FOR ALL
USING (true);

-- Index pour performance sur les requêtes de monitoring
CREATE INDEX IF NOT EXISTS idx_payment_anomalies_created_at 
ON public.payment_anomalies(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_payment_anomalies_payment_intent 
ON public.payment_anomalies(payment_intent_id);
