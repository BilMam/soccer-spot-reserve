
-- Vérifier et ajouter seulement les politiques RLS manquantes pour la table bookings

-- Supprimer d'abord toutes les politiques existantes pour éviter les conflits
DROP POLICY IF EXISTS "Users can view their own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can create their own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can update their own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Field owners can view bookings for their fields" ON public.bookings;
DROP POLICY IF EXISTS "Field owners can update booking status for their fields" ON public.bookings;
DROP POLICY IF EXISTS "Field owners can update booking status" ON public.bookings;

-- Recréer toutes les politiques nécessaires
CREATE POLICY "Users can view their own bookings" ON public.bookings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own bookings" ON public.bookings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bookings" ON public.bookings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Field owners can view bookings for their fields" ON public.bookings
  FOR SELECT USING (
    auth.uid() IN (
      SELECT owner_id FROM public.fields WHERE id = field_id
    )
  );

CREATE POLICY "Field owners can update booking status for their fields" ON public.bookings
  FOR UPDATE USING (
    auth.uid() IN (
      SELECT owner_id FROM public.fields WHERE id = field_id
    )
  );
