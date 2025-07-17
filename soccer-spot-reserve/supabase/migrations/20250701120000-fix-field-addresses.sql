
-- Corriger les adresses des terrains factices avec des adresses précises d'Abidjan

-- 1. Temple du Foot d'Akouedo
UPDATE public.fields 
SET 
  address = 'Université Félix Houphouët-Boigny, Cocody',
  city = 'Abidjan',
  location = 'Cocody',
  latitude = 5.372,
  longitude = -3.987
WHERE name = 'Temple du Foot d''Akouedo';

-- 2. Arena 
UPDATE public.fields 
SET 
  address = 'Campus Universitaire de Cocody, Boulevard de l''Université',
  city = 'Abidjan',
  location = 'Cocody',
  latitude = 5.371,
  longitude = -3.986
WHERE name = 'Arena';

-- 3. Stade Municipal Jean Bouin
UPDATE public.fields 
SET 
  address = 'Boulevard de la République, Plateau',
  city = 'Abidjan',
  location = 'Plateau',
  latitude = 5.323,
  longitude = -4.024
WHERE name = 'Stade Municipal Jean Bouin';

-- 4. Terrain Synthétique Dupleix
UPDATE public.fields 
SET 
  address = 'Rue Jesse Jackson, Cocody',
  city = 'Abidjan',
  location = 'Cocody',
  latitude = 5.364,
  longitude = -3.999
WHERE name = 'Terrain Synthétique Dupleix';

-- 5. City Stade Belleville
UPDATE public.fields 
SET 
  address = 'Marché Gouro, Adjamé',
  city = 'Abidjan',
  location = 'Adjamé',
  latitude = 5.366,
  longitude = -4.021
WHERE name = 'City Stade Belleville';

-- 6. Complex Sportif Reuilly
UPDATE public.fields 
SET 
  address = 'Zone 4C, Marcory',
  city = 'Abidjan',
  location = 'Marcory',
  latitude = 5.293,
  longitude = -3.989
WHERE name = 'Complex Sportif Reuilly';

-- 7. Five Montparnasse
UPDATE public.fields 
SET 
  address = 'Boulevard Giscard d''Estaing, Cocody',
  city = 'Abidjan',
  location = 'Cocody',
  latitude = 5.356,
  longitude = -4.001
WHERE name = 'Five Montparnasse';

-- 8. Terrain Bastille Sports
UPDATE public.fields 
SET 
  address = 'Port d''Abidjan, Treichville',
  city = 'Abidjan',
  location = 'Treichville',
  latitude = 5.301,
  longitude = -4.003
WHERE name = 'Terrain Bastille Sports';

-- 9. Urban
UPDATE public.fields 
SET 
  address = 'Riviera Palmeraie, Cocody',
  city = 'Abidjan',
  location = 'Cocody',
  latitude = 5.378,
  longitude = -3.972
WHERE name = 'Urban';

-- 10. Duplex
UPDATE public.fields 
SET 
  address = 'II Plateaux Vallon, Cocody',
  city = 'Abidjan',
  location = 'Cocody',
  latitude = 5.359,
  longitude = -3.981
WHERE name = 'Duplex';

-- Vérifier s'il y a d'autres terrains sans coordonnées
UPDATE public.fields 
SET 
  address = 'Université Félix Houphouët-Boigny, Cocody',
  city = 'Abidjan',
  location = 'Cocody',
  latitude = 5.372,
  longitude = -3.987
WHERE name ILIKE '%akouedo%' 
  AND (latitude IS NULL OR longitude IS NULL);
