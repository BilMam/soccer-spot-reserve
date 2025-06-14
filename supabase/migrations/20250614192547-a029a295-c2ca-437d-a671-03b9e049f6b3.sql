
-- Créer une table pour les statistiques des propriétaires
CREATE TABLE public.owner_stats (
  owner_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  field_id uuid REFERENCES public.fields(id) ON DELETE CASCADE,
  field_name text NOT NULL,
  total_bookings integer DEFAULT 0,
  confirmed_bookings integer DEFAULT 0,
  pending_bookings integer DEFAULT 0,
  total_revenue numeric DEFAULT 0,
  avg_rating numeric DEFAULT 0,
  total_reviews integer DEFAULT 0,
  updated_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (owner_id, field_id)
);

-- Activer RLS sur la table des statistiques
ALTER TABLE public.owner_stats ENABLE ROW LEVEL SECURITY;

-- Politique RLS pour la table des statistiques
CREATE POLICY "Owners can view their own stats" 
ON public.owner_stats
FOR SELECT 
USING (auth.uid() = owner_id);

-- Fonction pour mettre à jour les statistiques d'un terrain
CREATE OR REPLACE FUNCTION public.update_owner_stats_for_field(field_uuid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  field_owner_id uuid;
  field_name_var text;
  stats_record record;
BEGIN
  -- Récupérer les informations du terrain
  SELECT owner_id, name INTO field_owner_id, field_name_var
  FROM public.fields WHERE id = field_uuid;
  
  -- Calculer les statistiques
  SELECT 
    COUNT(b.id) as total_bookings,
    COUNT(CASE WHEN b.status = 'confirmed' THEN 1 END) as confirmed_bookings,
    COUNT(CASE WHEN b.status = 'pending' THEN 1 END) as pending_bookings,
    COALESCE(SUM(CASE WHEN b.status = 'confirmed' THEN b.total_price END), 0) as total_revenue,
    COALESCE(AVG(r.rating), 0) as avg_rating,
    COUNT(r.id) as total_reviews
  INTO stats_record
  FROM public.fields f
  LEFT JOIN public.bookings b ON f.id = b.field_id
  LEFT JOIN public.reviews r ON f.id = r.field_id
  WHERE f.id = field_uuid
  GROUP BY f.id;
  
  -- Insérer ou mettre à jour les statistiques
  INSERT INTO public.owner_stats (
    owner_id, field_id, field_name, total_bookings, confirmed_bookings, 
    pending_bookings, total_revenue, avg_rating, total_reviews
  ) VALUES (
    field_owner_id, field_uuid, field_name_var, 
    COALESCE(stats_record.total_bookings, 0),
    COALESCE(stats_record.confirmed_bookings, 0),
    COALESCE(stats_record.pending_bookings, 0),
    COALESCE(stats_record.total_revenue, 0),
    COALESCE(stats_record.avg_rating, 0),
    COALESCE(stats_record.total_reviews, 0)
  )
  ON CONFLICT (owner_id, field_id) 
  DO UPDATE SET
    field_name = EXCLUDED.field_name,
    total_bookings = EXCLUDED.total_bookings,
    confirmed_bookings = EXCLUDED.confirmed_bookings,
    pending_bookings = EXCLUDED.pending_bookings,
    total_revenue = EXCLUDED.total_revenue,
    avg_rating = EXCLUDED.avg_rating,
    total_reviews = EXCLUDED.total_reviews,
    updated_at = now();
END;
$$;

-- Fonction pour obtenir les réservations récentes d'un propriétaire
CREATE OR REPLACE FUNCTION public.get_owner_recent_bookings(owner_uuid uuid)
RETURNS TABLE (
  booking_id uuid,
  field_name text,
  user_name text,
  booking_date date,
  start_time time,
  end_time time,
  status text,
  total_price numeric,
  player_count integer
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    b.id,
    f.name,
    p.full_name,
    b.booking_date,
    b.start_time,
    b.end_time,
    b.status,
    b.total_price,
    b.player_count
  FROM public.bookings b
  JOIN public.fields f ON b.field_id = f.id
  JOIN public.profiles p ON b.user_id = p.id
  WHERE f.owner_id = owner_uuid
  ORDER BY b.created_at DESC
  LIMIT 10;
$$;

-- Initialiser les statistiques pour tous les terrains existants
INSERT INTO public.owner_stats (owner_id, field_id, field_name)
SELECT owner_id, id, name FROM public.fields
ON CONFLICT (owner_id, field_id) DO NOTHING;

-- Mettre à jour les statistiques pour tous les terrains
DO $$
DECLARE
  field_record record;
BEGIN
  FOR field_record IN SELECT id FROM public.fields LOOP
    PERFORM public.update_owner_stats_for_field(field_record.id);
  END LOOP;
END $$;
