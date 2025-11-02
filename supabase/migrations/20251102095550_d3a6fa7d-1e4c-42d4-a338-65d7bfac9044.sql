-- Fonction de nettoyage automatique des HOLDs expirés
CREATE OR REPLACE FUNCTION public.cleanup_expired_holds()
RETURNS trigger 
LANGUAGE plpgsql 
SECURITY DEFINER
AS $$
BEGIN
  -- Si le HOLD est expiré, nettoyer les champs
  IF NEW.on_hold_until IS NOT NULL AND NEW.on_hold_until < NOW() THEN
    NEW.on_hold_until := NULL;
    NEW.hold_cagnotte_id := NULL;
    RAISE NOTICE 'HOLD expiré nettoyé pour slot %', NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger pour nettoyer automatiquement les HOLDs expirés lors des mises à jour
DROP TRIGGER IF EXISTS trg_cleanup_expired_holds ON public.field_availability;
CREATE TRIGGER trg_cleanup_expired_holds
BEFORE UPDATE ON public.field_availability
FOR EACH ROW 
EXECUTE FUNCTION public.cleanup_expired_holds();

-- Fonction batch pour nettoyer tous les HOLDs expirés existants
CREATE OR REPLACE FUNCTION public.batch_cleanup_expired_holds()
RETURNS integer 
LANGUAGE plpgsql 
SECURITY DEFINER
AS $$
DECLARE 
  v_count int;
BEGIN
  UPDATE public.field_availability
  SET on_hold_until = NULL,
      hold_cagnotte_id = NULL
  WHERE on_hold_until IS NOT NULL
    AND on_hold_until < NOW();
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'Nettoyé % HOLDs expirés', v_count;
  RETURN v_count;
END;
$$;

-- Exécuter un nettoyage initial des HOLDs expirés
SELECT public.batch_cleanup_expired_holds();