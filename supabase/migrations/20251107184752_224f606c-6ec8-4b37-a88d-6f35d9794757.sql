-- Fonction temporaire pour mettre à jour les métadonnées des contributions en attente
CREATE OR REPLACE FUNCTION public.update_contribution_metadata_for_refund(
  p_contribution_ids UUID[],
  p_phone_e164 TEXT
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  -- Mettre à jour les métadonnées des contributions spécifiées
  UPDATE public.cagnotte_contribution
  SET metadata = jsonb_set(
    COALESCE(metadata, '{}'::jsonb),
    '{payer_phone_e164}',
    to_jsonb(p_phone_e164)
  ),
  updated_at = now()
  WHERE id = ANY(p_contribution_ids);
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  RETURN updated_count;
END;
$$;