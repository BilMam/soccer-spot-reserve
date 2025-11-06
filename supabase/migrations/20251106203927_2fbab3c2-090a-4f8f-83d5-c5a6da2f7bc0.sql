-- Mise à jour de la fonction get_field_bookings pour éliminer owner_confirmed
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
    AND b.status IN ('confirmed', 'completed')
    AND b.payment_status = 'paid'
  ORDER BY b.booking_date, b.start_time;
END;
$function$;

-- Mise à jour de la fonction check_slot_booking_status pour éliminer owner_confirmed
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
      AND status IN ('confirmed', 'completed')
      AND payment_status = 'paid'
      AND start_time = p_start_time
      AND end_time = p_end_time
  );
END;
$function$;