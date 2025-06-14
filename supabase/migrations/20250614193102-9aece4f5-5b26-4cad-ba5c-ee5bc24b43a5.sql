
-- Ajouter les politiques RLS manquantes pour que les propriétaires puissent voir leurs données

-- Politique pour que les propriétaires puissent voir leurs terrains
CREATE POLICY "Owners can view their own fields" 
ON public.fields 
FOR ALL 
USING (auth.uid() = owner_id);

-- Politique pour que les propriétaires puissent voir les profils des utilisateurs qui réservent
CREATE POLICY "Field owners can view customer profiles" 
ON public.profiles 
FOR SELECT 
USING (
  auth.uid() IN (
    SELECT DISTINCT f.owner_id 
    FROM public.fields f 
    JOIN public.bookings b ON f.id = b.field_id 
    WHERE b.user_id = profiles.id
  )
);

-- Politique pour que les propriétaires puissent voir les avis sur leurs terrains
CREATE POLICY "Field owners can view reviews for their fields" 
ON public.reviews 
FOR SELECT 
USING (
  auth.uid() IN (
    SELECT owner_id FROM public.fields WHERE id = field_id
  )
);

-- Politique pour que les propriétaires puissent modifier le statut des réservations
CREATE POLICY "Field owners can update booking status" 
ON public.bookings 
FOR UPDATE 
USING (
  auth.uid() IN (
    SELECT owner_id FROM public.fields WHERE id = field_id
  )
);

-- Déclencheur pour mettre à jour automatiquement les statistiques quand une réservation change
CREATE OR REPLACE FUNCTION public.trigger_update_owner_stats()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Mettre à jour les stats pour le terrain concerné
  PERFORM public.update_owner_stats_for_field(
    CASE 
      WHEN TG_OP = 'DELETE' THEN OLD.field_id
      ELSE NEW.field_id
    END
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Créer les déclencheurs pour maintenir les stats à jour
CREATE TRIGGER booking_stats_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.trigger_update_owner_stats();

CREATE TRIGGER review_stats_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.trigger_update_owner_stats();
