
-- Insérer un utilisateur propriétaire de test (nécessaire pour les terrains)
INSERT INTO public.profiles (id, email, full_name, user_type) 
VALUES (
  'a40bc10f-06e7-46fd-8c16-ec419ff364ce',
  'owner@test.com',
  'Propriétaire Test',
  'owner'
) ON CONFLICT (id) DO NOTHING;

-- Insérer les terrains de test
INSERT INTO public.fields (
  id, owner_id, name, description, location, address, city, 
  price_per_hour, capacity, field_type, amenities, images, 
  availability_start, availability_end, is_active, rating, total_reviews
) VALUES 
(
  '11111111-1111-1111-1111-111111111111',
  'a40bc10f-06e7-46fd-8c16-ec419ff364ce',
  'Stade Municipal Jean Bouin',
  'Terrain de football avec gazon naturel en excellent état',
  'Paris 16ème',
  '26 Avenue du Général Sarrail',
  'Paris',
  45.00,
  22,
  'natural_grass',
  ARRAY['Parking', 'Vestiaires', 'Éclairage'],
  ARRAY['https://images.unsplash.com/photo-1574629810360-7efbbe195018?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'],
  '08:00',
  '22:00',
  true,
  4.8,
  124
),
(
  '22222222-2222-2222-2222-222222222222',
  'a40bc10f-06e7-46fd-8c16-ec419ff364ce',
  'Terrain Synthétique Dupleix',
  'Terrain synthétique moderne avec équipements complets',
  'Paris 15ème',
  '45 Avenue Dupleix',
  'Paris',
  35.00,
  14,
  'synthetic',
  ARRAY['Wifi', 'Parking', 'Vestiaires'],
  ARRAY['https://images.unsplash.com/photo-1551698618-1dfe5d97d256?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'],
  '08:00',
  '22:00',
  true,
  4.6,
  89
),
(
  '33333333-3333-3333-3333-333333333333',
  'a40bc10f-06e7-46fd-8c16-ec419ff364ce',
  'City Stade Belleville',
  'Terrain urbain accessible à tous',
  'Paris 20ème',
  'Rue de Belleville',
  'Paris',
  25.00,
  10,
  'street',
  ARRAY['Éclairage', 'Accès libre'],
  ARRAY['https://images.unsplash.com/photo-1589952283406-b53a7d1347e8?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'],
  '08:00',
  '22:00',
  true,
  4.4,
  67
),
(
  '44444444-4444-4444-4444-444444444444',
  'a40bc10f-06e7-46fd-8c16-ec419ff364ce',
  'Complex Sportif Reuilly',
  'Complexe sportif haut de gamme avec toutes les commodités',
  'Paris 12ème',
  'Place Félix Éboué',
  'Paris',
  55.00,
  22,
  'natural_grass',
  ARRAY['Parking', 'Vestiaires', 'Wifi', 'Douches'],
  ARRAY['https://images.unsplash.com/photo-1529900748604-07564a03e7a6?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'],
  '08:00',
  '22:00',
  true,
  4.9,
  156
),
(
  '55555555-5555-5555-5555-555555555555',
  'a40bc10f-06e7-46fd-8c16-ec419ff364ce',
  'Five Montparnasse',
  'Terrain couvert avec climatisation',
  'Paris 14ème',
  'Avenue du Maine',
  'Paris',
  40.00,
  10,
  'indoor',
  ARRAY['Vestiaires', 'Éclairage', 'Climatisation'],
  ARRAY['https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'],
  '08:00',
  '22:00',
  true,
  4.7,
  98
),
(
  '66666666-6666-6666-6666-666666666666',
  'a40bc10f-06e7-46fd-8c16-ec419ff364ce',
  'Terrain Bastille Sports',
  'Terrain synthétique proche de Bastille',
  'Paris 11ème',
  'Rue de la Bastille',
  'Paris',
  30.00,
  14,
  'synthetic',
  ARRAY['Parking', 'Éclairage'],
  ARRAY['https://images.unsplash.com/photo-1553778263-73a83bab9b0c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'],
  '08:00',
  '22:00',
  true,
  4.3,
  75
)
ON CONFLICT (id) DO NOTHING;
