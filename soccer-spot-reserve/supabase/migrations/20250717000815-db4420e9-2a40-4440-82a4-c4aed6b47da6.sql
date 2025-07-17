-- Créer une fonction pour récupérer les réservations d'un terrain de manière publique
CREATE OR REPLACE FUNCTION public.get_field_bookings(p_field_id uuid, p_start_date date, p_end_date date)
RETURNS TABLE(
  booking_date date,
  start_time time without time zone,
  end_time time without time zone,
  status text,
  payment_status text
)
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
    AND b.status IN ('pending', 'confirmed', 'owner_confirmed')
  ORDER BY b.booking_date, b.start_time;
END;
$function$;