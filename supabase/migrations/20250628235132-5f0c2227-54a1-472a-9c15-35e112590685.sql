
-- Corriger l'image du City Stade Belleville pour mettre un vrai terrain de football
UPDATE public.fields 
SET images = ARRAY['https://images.unsplash.com/photo-1574629810360-7efbbe195018?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80']
WHERE name = 'City Stade Belleville';
