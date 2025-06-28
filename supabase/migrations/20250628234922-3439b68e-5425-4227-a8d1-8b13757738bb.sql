
-- Mettre à jour les terrains pour remplacer Paris par Abidjan
UPDATE public.fields 
SET 
  location = REPLACE(location, 'Paris', 'Abidjan'),
  address = CASE 
    WHEN name = 'Stade Municipal Jean Bouin' THEN '26 Avenue Général Sarrail'
    WHEN name = 'Terrain Synthétique Dupleix' THEN '45 Avenue Dupleix'
    WHEN name = 'City Stade Belleville' THEN 'Rue de Belleville'
    WHEN name = 'Complex Sportif Reuilly' THEN 'Place Félix Éboué'
    WHEN name = 'Five Montparnasse' THEN 'Avenue du Maine'
    WHEN name = 'Terrain Bastille Sports' THEN 'Rue de la Bastille'
    ELSE address
  END,
  city = 'Abidjan',
  images = CASE 
    WHEN name = 'City Stade Belleville' THEN 
      ARRAY['https://images.unsplash.com/photo-1551698618-1dfe5d97d256?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80']
    WHEN name = 'Terrain Synthétique Dupleix' THEN 
      ARRAY['https://images.unsplash.com/photo-1574629810360-7efbbe195018?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80']
    ELSE images
  END
WHERE city = 'Paris';

-- Mettre à jour les arrondissements pour des quartiers d'Abidjan
UPDATE public.fields 
SET 
  location = CASE 
    WHEN location LIKE '%16ème%' THEN 'Cocody'
    WHEN location LIKE '%15ème%' THEN 'Plateau'
    WHEN location LIKE '%20ème%' THEN 'Adjamé'
    WHEN location LIKE '%12ème%' THEN 'Marcory'
    WHEN location LIKE '%14ème%' THEN 'Treichville'
    WHEN location LIKE '%11ème%' THEN 'Yopougon'
    ELSE location
  END
WHERE city = 'Abidjan';
