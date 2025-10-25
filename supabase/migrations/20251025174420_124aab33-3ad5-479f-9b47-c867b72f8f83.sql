-- Migration: Nouvelle politique de prix avec commission 3%
-- Ajouter les colonnes pour prix net et prix public

-- Ajouter les nouvelles colonnes
ALTER TABLE fields 
ADD COLUMN IF NOT EXISTS net_price_1h numeric,
ADD COLUMN IF NOT EXISTS net_price_1h30 numeric,
ADD COLUMN IF NOT EXISTS net_price_2h numeric,
ADD COLUMN IF NOT EXISTS public_price_1h numeric,
ADD COLUMN IF NOT EXISTS public_price_1h30 numeric,
ADD COLUMN IF NOT EXISTS public_price_2h numeric,
ADD COLUMN IF NOT EXISTS commission_rate numeric DEFAULT 0.03;

-- Migrer les données existantes (anciens prix deviennent prix nets)
UPDATE fields 
SET 
  net_price_1h = price_per_hour,
  net_price_1h30 = price_1h30,
  net_price_2h = price_2h
WHERE net_price_1h IS NULL AND price_per_hour IS NOT NULL;

-- Calcul initial des prix publics (approximatif avec arrondi commercial)
UPDATE fields
SET
  public_price_1h = CASE 
    WHEN net_price_1h IS NOT NULL THEN
      -- Appliquer la formule: net / 0.97 puis arrondir à .000 ou .500
      CASE 
        WHEN MOD(CEIL(net_price_1h / 0.97)::integer, 1000) = 0 THEN 
          (FLOOR(CEIL(net_price_1h / 0.97) / 1000) * 1000)
        WHEN MOD(CEIL(net_price_1h / 0.97)::integer, 1000) <= 500 THEN 
          (FLOOR(CEIL(net_price_1h / 0.97) / 1000) * 1000 + 500)
        ELSE 
          ((FLOOR(CEIL(net_price_1h / 0.97) / 1000) + 1) * 1000)
      END
    ELSE NULL
  END,
  public_price_1h30 = CASE 
    WHEN net_price_1h30 IS NOT NULL THEN
      CASE 
        WHEN MOD(CEIL(net_price_1h30 / 0.97)::integer, 1000) = 0 THEN 
          (FLOOR(CEIL(net_price_1h30 / 0.97) / 1000) * 1000)
        WHEN MOD(CEIL(net_price_1h30 / 0.97)::integer, 1000) <= 500 THEN 
          (FLOOR(CEIL(net_price_1h30 / 0.97) / 1000) * 1000 + 500)
        ELSE 
          ((FLOOR(CEIL(net_price_1h30 / 0.97) / 1000) + 1) * 1000)
      END
    ELSE NULL
  END,
  public_price_2h = CASE 
    WHEN net_price_2h IS NOT NULL THEN
      CASE 
        WHEN MOD(CEIL(net_price_2h / 0.97)::integer, 1000) = 0 THEN 
          (FLOOR(CEIL(net_price_2h / 0.97) / 1000) * 1000)
        WHEN MOD(CEIL(net_price_2h / 0.97)::integer, 1000) <= 500 THEN 
          (FLOOR(CEIL(net_price_2h / 0.97) / 1000) * 1000 + 500)
        ELSE 
          ((FLOOR(CEIL(net_price_2h / 0.97) / 1000) + 1) * 1000)
      END
    ELSE NULL
  END
WHERE public_price_1h IS NULL;