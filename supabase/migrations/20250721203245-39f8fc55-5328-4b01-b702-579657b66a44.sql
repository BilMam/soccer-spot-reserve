-- Migration pour optimiser le système de réservation
-- Les créneaux ne seront bloqués qu'après confirmation de paiement

-- 1. Vérifier d'abord les valeurs existantes dans la colonne status
DO $$
BEGIN
  -- Ajouter 'initiated' comme valeur valide pour status si ce n'est pas déjà fait
  -- La colonne status est de type text, donc pas besoin de type enum
  
  -- Vérifier si 'expired' est aussi nécessaire
  IF NOT EXISTS (SELECT 1 FROM public.bookings WHERE status = 'expired') THEN
    -- La valeur 'expired' n'existe pas encore, c'est normal
    NULL;
  END IF;
END $$;

-- 2. Mettre à jour la fonction get_field_bookings pour ne considérer que les réservations confirmées
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

-- 3. Créer une fonction pour nettoyer les réservations "zombies" (initiées mais jamais payées)
CREATE OR REPLACE FUNCTION public.cleanup_expired_bookings()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- Marquer comme expirées les réservations initiées depuis plus de 15 minutes
  UPDATE public.bookings 
  SET 
    status = 'expired',
    payment_status = 'expired',
    updated_at = now()
  WHERE status = 'initiated'
    AND payment_status = 'pending'
    AND created_at < (now() - INTERVAL '15 minutes');
    
  -- Log du nettoyage si la table booking_notifications existe
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'booking_notifications') THEN
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

-- 4. Créer un index pour optimiser la requête de nettoyage
CREATE INDEX IF NOT EXISTS idx_bookings_cleanup 
ON public.bookings(status, payment_status, created_at) 
WHERE status = 'initiated' AND payment_status = 'pending';

-- 5. Créer une contrainte unique pour éviter les double-réservations (seulement pour les réservations confirmées)
-- Supprimer l'ancienne contrainte si elle existe
DROP INDEX IF EXISTS unique_confirmed_booking_slot;

-- Créer la nouvelle contrainte qui ne s'applique qu'aux réservations confirmées et payées
CREATE UNIQUE INDEX unique_confirmed_booking_slot 
ON public.bookings(field_id, booking_date, start_time, end_time) 
WHERE status IN ('confirmed', 'owner_confirmed', 'completed') 
  AND payment_status = 'paid';

-- 6. Commenter/documenter les changements
COMMENT ON FUNCTION public.get_field_bookings(uuid, date, date) IS 
'Retourne uniquement les réservations confirmées et payées pour éviter que les tentatives de paiement bloquent les créneaux';

COMMENT ON FUNCTION public.cleanup_expired_bookings() IS 
'Nettoie automatiquement les réservations initiées mais jamais confirmées après 15 minutes';

COMMENT ON INDEX unique_confirmed_booking_slot IS 
'Contrainte d''unicité qui ne s''applique qu''aux réservations réellement confirmées et payées';