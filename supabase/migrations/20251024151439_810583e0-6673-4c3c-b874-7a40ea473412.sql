-- Add adaptive pricing columns to fields table
ALTER TABLE fields 
ADD COLUMN price_1h30 numeric,
ADD COLUMN price_2h numeric;

-- Add comment explaining the pricing logic
COMMENT ON COLUMN fields.price_per_hour IS 'Prix pour 1 heure de réservation';
COMMENT ON COLUMN fields.price_1h30 IS 'Prix pour 1h30 de réservation';
COMMENT ON COLUMN fields.price_2h IS 'Prix pour 2 heures de réservation';

-- Set default values based on existing price_per_hour for existing records
UPDATE fields 
SET 
  price_1h30 = price_per_hour * 1.5,
  price_2h = price_per_hour * 2
WHERE price_1h30 IS NULL OR price_2h IS NULL;