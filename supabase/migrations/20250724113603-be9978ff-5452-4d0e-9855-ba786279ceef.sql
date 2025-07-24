-- Phase 0 & 1: Nettoyage des données et correction immédiate

-- 0. Supprimer les terrains de démo (6 terrains avec IDs factices)
DELETE FROM bookings WHERE field_id IN (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222', 
  '33333333-3333-3333-3333-333333333333',
  '44444444-4444-4444-4444-444444444444',
  '55555555-5555-5555-5555-555555555555',
  '66666666-6666-6666-6666-666666666666'
);

DELETE FROM fields WHERE id IN (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222', 
  '33333333-3333-3333-3333-333333333333',
  '44444444-4444-4444-4444-444444444444',
  '55555555-5555-5555-5555-555555555555',
  '66666666-6666-6666-6666-666666666666'
);

-- 1. Créer/compléter l'enregistrement owner manquant pour super_admin
INSERT INTO owners (user_id)  
VALUES ('a40bc10f-06e7-46fd-8c16-ec419ff364ce')  
ON CONFLICT (user_id) DO NOTHING;

-- 2. Ajouter un payout_accounts actif pour super_admin
INSERT INTO payout_accounts (owner_id, phone, label, is_active)  
SELECT id, '0700000000', 'Compte principal', true 
FROM owners  
WHERE user_id = 'a40bc10f-06e7-46fd-8c16-ec419ff364ce'
ON CONFLICT DO NOTHING;

-- 3. Garantir qu'aucun terrain réel ne reste orphelin
-- Créer automatiquement les enregistrements owners manquants
INSERT INTO owners (user_id)
SELECT DISTINCT f.owner_id
FROM fields f 
LEFT JOIN owners o ON f.owner_id = o.user_id
WHERE o.id IS NULL
ON CONFLICT (user_id) DO NOTHING;