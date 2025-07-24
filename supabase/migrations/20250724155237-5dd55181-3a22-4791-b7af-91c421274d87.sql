-- Migration pour corriger les enregistrements manquants dans owners
-- et synchroniser les payout_accounts et payouts

-- 1. Créer les enregistrements manquants dans owners pour tous les propriétaires de terrains
INSERT INTO public.owners (id, user_id, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  f.owner_id,
  now(),
  now()
FROM public.fields f
LEFT JOIN public.owners o ON o.user_id = f.owner_id
WHERE o.id IS NULL
GROUP BY f.owner_id
ON CONFLICT (user_id) DO NOTHING;

-- 2. Mettre à jour les payout_accounts pour pointer vers les bons owners.id
UPDATE public.payout_accounts pa
SET owner_id = o.id
FROM public.owners o
WHERE pa.owner_id::text = o.user_id::text
AND pa.owner_id != o.id;

-- 3. Backfiller les anciennes lignes payouts pour utiliser owners.id au lieu de user_id
UPDATE public.payouts p
SET owner_id = o.id
FROM public.owners o
WHERE p.owner_id::text = o.user_id::text
AND p.owner_id::text != o.id::text;

-- 4. Créer un trigger pour s'assurer qu'un enregistrement owners existe
-- quand un nouveau terrain est créé
CREATE OR REPLACE FUNCTION public.ensure_owner_exists()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.owners (user_id) VALUES (NEW.owner_id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- 5. Attacher le trigger aux terrains
DROP TRIGGER IF EXISTS ensure_owner_exists_trigger ON public.fields;
CREATE TRIGGER ensure_owner_exists_trigger
  BEFORE INSERT ON public.fields
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_owner_exists();