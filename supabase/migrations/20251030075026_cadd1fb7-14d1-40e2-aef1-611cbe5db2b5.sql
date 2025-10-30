-- Migration: Team-based cagnotte with configurable team sizes and flexible contributions

-- 1. Add team size columns to cagnotte table
ALTER TABLE public.cagnotte
  ADD COLUMN IF NOT EXISTS teama_size integer NOT NULL DEFAULT 8,
  ADD COLUMN IF NOT EXISTS teamb_size integer NOT NULL DEFAULT 8;

-- 2. Create RPC to get team info for frontend
CREATE OR REPLACE FUNCTION public.get_cagnotte_team_info(p_cagnotte_id uuid, p_team text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_cagnotte record;
  v_team_target numeric;
  v_team_collected numeric;
  v_team_remaining numeric;
  v_team_size integer;
  v_suggested_part numeric;
  v_collected_a numeric;
  v_collected_b numeric;
BEGIN
  -- Get cagnotte info
  SELECT * INTO v_cagnotte
  FROM public.cagnotte
  WHERE id = p_cagnotte_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cagnotte introuvable';
  END IF;
  
  -- Validate team
  IF p_team NOT IN ('A', 'B') THEN
    RAISE EXCEPTION 'Équipe invalide: doit être A ou B';
  END IF;
  
  -- Calculate team-specific values
  IF p_team = 'A' THEN
    v_team_target := v_cagnotte.teama_target;
    v_team_size := v_cagnotte.teama_size;
  ELSE
    v_team_target := v_cagnotte.teamb_target;
    v_team_size := v_cagnotte.teamb_size;
  END IF;
  
  -- Calculate team collected amount
  SELECT COALESCE(SUM(amount), 0) INTO v_team_collected
  FROM public.cagnotte_contribution
  WHERE cagnotte_id = p_cagnotte_id
    AND team = p_team
    AND status = 'SUCCEEDED';
  
  v_team_remaining := GREATEST(v_team_target - v_team_collected, 0);
  v_suggested_part := CEIL(v_team_target / v_team_size);
  
  -- Calculate both teams for progress bars
  SELECT COALESCE(SUM(amount), 0) INTO v_collected_a
  FROM public.cagnotte_contribution
  WHERE cagnotte_id = p_cagnotte_id
    AND team = 'A'
    AND status = 'SUCCEEDED';
  
  SELECT COALESCE(SUM(amount), 0) INTO v_collected_b
  FROM public.cagnotte_contribution
  WHERE cagnotte_id = p_cagnotte_id
    AND team = 'B'
    AND status = 'SUCCEEDED';
  
  RETURN jsonb_build_object(
    'team', p_team,
    'team_target', v_team_target,
    'team_collected', v_team_collected,
    'team_remaining', v_team_remaining,
    'team_size', v_team_size,
    'suggested_part', v_suggested_part,
    'teama_collected', v_collected_a,
    'teama_target', v_cagnotte.teama_target,
    'teamb_collected', v_collected_b,
    'teamb_target', v_cagnotte.teamb_target,
    'total_collected', v_cagnotte.collected_amount,
    'total_amount', v_cagnotte.total_amount,
    'status', v_cagnotte.status,
    'expires_at', v_cagnotte.expires_at,
    'hold_expires_at', v_cagnotte.hold_expires_at
  );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_cagnotte_team_info(uuid, text) TO authenticated, anon;