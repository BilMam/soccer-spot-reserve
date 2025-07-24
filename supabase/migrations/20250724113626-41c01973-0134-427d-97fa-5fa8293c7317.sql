-- Phase 2: Migrations structurantes (FK + onboarding auto)

-- FK explicite fields.owner_id → owners.user_id
ALTER TABLE fields
  ADD CONSTRAINT fk_fields_owner
  FOREIGN KEY (owner_id) REFERENCES owners(user_id);

-- FK payout_accounts.owner_id → owners.id  
ALTER TABLE payout_accounts
  ADD CONSTRAINT fk_pa_owner
  FOREIGN KEY (owner_id) REFERENCES owners(id);

-- Fonction pour créer automatiquement un enregistrement owners
CREATE OR REPLACE FUNCTION ensure_owner_exists()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.owners (user_id) VALUES (NEW.owner_id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Trigger pour créer automatiquement l'enregistrement owners
CREATE TRIGGER trg_fields_owner
BEFORE INSERT ON fields
FOR EACH ROW EXECUTE FUNCTION ensure_owner_exists();