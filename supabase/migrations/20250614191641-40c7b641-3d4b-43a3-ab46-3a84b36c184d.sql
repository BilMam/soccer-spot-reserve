
-- Créer les politiques seulement si elles n'existent pas déjà

-- Politique pour les avis (si elle n'existe pas)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'reviews' 
        AND policyname = 'Anyone can view reviews'
    ) THEN
        CREATE POLICY "Anyone can view reviews" 
        ON public.reviews 
        FOR SELECT 
        USING (true);
    END IF;
END $$;

-- Politique pour les profils (si elle n'existe pas)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'profiles' 
        AND policyname = 'Anyone can view public profile info'
    ) THEN
        CREATE POLICY "Anyone can view public profile info" 
        ON public.profiles 
        FOR SELECT 
        USING (true);
    END IF;
END $$;

-- Activer RLS sur les tables si ce n'est pas déjà fait
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
