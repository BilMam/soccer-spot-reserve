-- Corriger le search_path pour permettre l'accès à pgcrypto

-- 1. Modifier generate_proof_token pour inclure extensions dans le search_path
CREATE OR REPLACE FUNCTION public.generate_proof_token()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  result TEXT;
  token_exists BOOLEAN;
BEGIN
  LOOP
    result := encode(gen_random_bytes(32), 'hex');
    
    SELECT EXISTS(
      SELECT 1 FROM public.cagnotte_contribution WHERE proof_token = result
    ) INTO token_exists;
    
    IF NOT token_exists THEN
      EXIT;
    END IF;
  END LOOP;
  
  RETURN result;
END;
$$;

-- 2. Modifier generate_proof_code pour inclure extensions dans le search_path
CREATE OR REPLACE FUNCTION public.generate_proof_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  result TEXT := '';
  i INTEGER;
  code_exists BOOLEAN;
BEGIN
  LOOP
    result := '';
    FOR i IN 1..8 LOOP
      result := result || substr(chars, 1 + floor(random() * length(chars))::integer, 1);
    END LOOP;
    
    SELECT EXISTS(
      SELECT 1 FROM public.cagnotte_contribution WHERE proof_code = result
    ) INTO code_exists;
    
    IF NOT code_exists THEN
      EXIT;
    END IF;
  END LOOP;
  
  RETURN result;
END;
$$;

-- 3. Modifier contribute_to_cagnotte pour inclure extensions dans le search_path
ALTER FUNCTION public.contribute_to_cagnotte(uuid, numeric, text, text, text, jsonb) 
  SET search_path TO 'public', 'extensions';

COMMENT ON FUNCTION public.generate_proof_token() IS 'Génère un token unique de 64 caractères hex pour les reçus de contribution';
COMMENT ON FUNCTION public.generate_proof_code() IS 'Génère un code court unique de 8 caractères pour les preuves publiques';