
-- Créer un bucket pour stocker les images des terrains
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'field-images',
  'field-images',
  true,
  5242880, -- 5MB limite
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
);

-- Politique pour permettre l'upload d'images aux utilisateurs authentifiés
CREATE POLICY "Users can upload field images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'field-images');

-- Politique pour permettre la lecture publique des images
CREATE POLICY "Anyone can view field images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'field-images');

-- Politique pour permettre aux utilisateurs de supprimer leurs propres images
CREATE POLICY "Users can delete their own field images"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'field-images' AND auth.uid()::text = (storage.foldername(name))[1]);
