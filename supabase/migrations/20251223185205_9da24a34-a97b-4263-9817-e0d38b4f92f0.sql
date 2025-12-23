-- =====================================================
-- MODULE PROMOTIONS - Tables principales
-- =====================================================

-- Table principale des codes promo
CREATE TABLE public.promo_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT, -- NULL pour les promos automatiques
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percent', 'fixed')),
  discount_value NUMERIC NOT NULL CHECK (discount_value > 0),
  usage_limit_total INTEGER, -- NULL = illimité
  usage_limit_per_user INTEGER DEFAULT 1,
  times_used INTEGER DEFAULT 0,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'expired', 'deleted')),
  is_automatic BOOLEAN DEFAULT false,
  min_booking_amount NUMERIC DEFAULT 0, -- Montant minimum de réservation
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index sur le code unique (excluant NULL pour les promos auto)
CREATE UNIQUE INDEX promo_codes_code_unique ON public.promo_codes (code) WHERE code IS NOT NULL;

-- Index pour les recherches propriétaire
CREATE INDEX idx_promo_codes_owner ON public.promo_codes (owner_id);
CREATE INDEX idx_promo_codes_status ON public.promo_codes (status);
CREATE INDEX idx_promo_codes_code ON public.promo_codes (code) WHERE code IS NOT NULL;

-- Table de liaison promo ↔ terrains (si vide = tous les terrains)
CREATE TABLE public.promo_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_code_id UUID NOT NULL REFERENCES public.promo_codes(id) ON DELETE CASCADE,
  field_id UUID NOT NULL REFERENCES public.fields(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(promo_code_id, field_id)
);

-- Index pour les recherches
CREATE INDEX idx_promo_fields_promo ON public.promo_fields (promo_code_id);
CREATE INDEX idx_promo_fields_field ON public.promo_fields (field_id);

-- Table de ciblage créneaux horaires (si vide = tous les créneaux)
CREATE TABLE public.promo_time_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_code_id UUID NOT NULL REFERENCES public.promo_codes(id) ON DELETE CASCADE,
  day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Dimanche, 6=Samedi
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  CHECK (end_time > start_time)
);

-- Index pour les recherches
CREATE INDEX idx_promo_time_slots_promo ON public.promo_time_slots (promo_code_id);

-- Table d'usage pour tracker les utilisations par utilisateur
CREATE TABLE public.promo_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_code_id UUID NOT NULL REFERENCES public.promo_codes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  used_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(promo_code_id, booking_id)
);

CREATE INDEX idx_promo_usage_promo_user ON public.promo_usage (promo_code_id, user_id);

-- Colonnes dans bookings pour traçabilité des promos
ALTER TABLE public.bookings 
  ADD COLUMN IF NOT EXISTS promo_code_id UUID REFERENCES public.promo_codes(id),
  ADD COLUMN IF NOT EXISTS public_before_discount NUMERIC,
  ADD COLUMN IF NOT EXISTS discount_amount NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS public_after_discount NUMERIC;

-- Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION public.update_promo_codes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_promo_codes_timestamp
  BEFORE UPDATE ON public.promo_codes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_promo_codes_updated_at();

-- =====================================================
-- Politiques RLS
-- =====================================================

-- Activer RLS sur toutes les tables
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_time_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_usage ENABLE ROW LEVEL SECURITY;

-- PROMO_CODES: Propriétaires peuvent gérer leurs promos
CREATE POLICY "Owners can manage their promo codes"
  ON public.promo_codes
  FOR ALL
  USING (auth.uid() = owner_id);

-- PROMO_CODES: Joueurs peuvent voir les promos actives (pour valider les codes)
CREATE POLICY "Players can view active promo codes"
  ON public.promo_codes
  FOR SELECT
  USING (status = 'active' AND (start_date IS NULL OR start_date <= CURRENT_DATE) AND (end_date IS NULL OR end_date >= CURRENT_DATE));

-- PROMO_FIELDS: Propriétaires peuvent gérer les liaisons
CREATE POLICY "Owners can manage promo_fields"
  ON public.promo_fields
  FOR ALL
  USING (promo_code_id IN (SELECT id FROM public.promo_codes WHERE owner_id = auth.uid()));

-- PROMO_FIELDS: Lecture publique pour validation
CREATE POLICY "Anyone can view promo_fields"
  ON public.promo_fields
  FOR SELECT
  USING (true);

-- PROMO_TIME_SLOTS: Propriétaires peuvent gérer le ciblage
CREATE POLICY "Owners can manage promo_time_slots"
  ON public.promo_time_slots
  FOR ALL
  USING (promo_code_id IN (SELECT id FROM public.promo_codes WHERE owner_id = auth.uid()));

-- PROMO_TIME_SLOTS: Lecture publique pour validation
CREATE POLICY "Anyone can view promo_time_slots"
  ON public.promo_time_slots
  FOR SELECT
  USING (true);

-- PROMO_USAGE: Système peut insérer
CREATE POLICY "System can insert promo_usage"
  ON public.promo_usage
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- PROMO_USAGE: Propriétaires peuvent voir l'usage de leurs promos
CREATE POLICY "Owners can view their promo usage"
  ON public.promo_usage
  FOR SELECT
  USING (promo_code_id IN (SELECT id FROM public.promo_codes WHERE owner_id = auth.uid()));

-- PROMO_USAGE: Utilisateurs peuvent voir leur propre usage
CREATE POLICY "Users can view their own promo usage"
  ON public.promo_usage
  FOR SELECT
  USING (auth.uid() = user_id);

-- =====================================================
-- Fonction de validation de code promo
-- =====================================================
CREATE OR REPLACE FUNCTION public.validate_promo_code(
  p_code TEXT,
  p_field_id UUID,
  p_booking_date DATE,
  p_start_time TIME,
  p_user_id UUID,
  p_booking_amount NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_promo RECORD;
  v_field_owner_id UUID;
  v_user_usage_count INTEGER;
  v_day_of_week INTEGER;
  v_field_targeted BOOLEAN;
  v_slot_targeted BOOLEAN;
BEGIN
  -- 1. Récupérer le propriétaire du terrain
  SELECT owner_id INTO v_field_owner_id FROM public.fields WHERE id = p_field_id;
  
  IF v_field_owner_id IS NULL THEN
    RETURN jsonb_build_object('valid', false, 'error', 'FIELD_NOT_FOUND', 'message', 'Terrain non trouvé');
  END IF;

  -- 2. Trouver la promo
  SELECT * INTO v_promo
  FROM public.promo_codes
  WHERE LOWER(code) = LOWER(p_code)
    AND owner_id = v_field_owner_id
    AND status = 'active'
    AND (start_date IS NULL OR start_date <= p_booking_date)
    AND (end_date IS NULL OR end_date >= p_booking_date);

  IF v_promo IS NULL THEN
    RETURN jsonb_build_object('valid', false, 'error', 'CODE_NOT_FOUND', 'message', 'Code promo invalide ou expiré');
  END IF;

  -- 3. Vérifier le montant minimum
  IF v_promo.min_booking_amount > 0 AND p_booking_amount < v_promo.min_booking_amount THEN
    RETURN jsonb_build_object('valid', false, 'error', 'MIN_AMOUNT_NOT_REACHED', 'message', 'Montant minimum non atteint: ' || v_promo.min_booking_amount || ' XOF');
  END IF;

  -- 4. Vérifier la limite totale d'utilisation
  IF v_promo.usage_limit_total IS NOT NULL AND v_promo.times_used >= v_promo.usage_limit_total THEN
    RETURN jsonb_build_object('valid', false, 'error', 'USAGE_LIMIT_REACHED', 'message', 'Ce code promo a atteint sa limite d''utilisation');
  END IF;

  -- 5. Vérifier la limite par utilisateur
  IF v_promo.usage_limit_per_user IS NOT NULL THEN
    SELECT COUNT(*) INTO v_user_usage_count
    FROM public.promo_usage
    WHERE promo_code_id = v_promo.id AND user_id = p_user_id;
    
    IF v_user_usage_count >= v_promo.usage_limit_per_user THEN
      RETURN jsonb_build_object('valid', false, 'error', 'USER_LIMIT_REACHED', 'message', 'Vous avez déjà utilisé ce code promo');
    END IF;
  END IF;

  -- 6. Vérifier si le terrain est ciblé
  SELECT EXISTS(SELECT 1 FROM public.promo_fields WHERE promo_code_id = v_promo.id) INTO v_field_targeted;
  
  IF v_field_targeted THEN
    IF NOT EXISTS(SELECT 1 FROM public.promo_fields WHERE promo_code_id = v_promo.id AND field_id = p_field_id) THEN
      RETURN jsonb_build_object('valid', false, 'error', 'FIELD_NOT_TARGETED', 'message', 'Ce code promo n''est pas valide pour ce terrain');
    END IF;
  END IF;

  -- 7. Vérifier si le créneau est ciblé
  SELECT EXISTS(SELECT 1 FROM public.promo_time_slots WHERE promo_code_id = v_promo.id) INTO v_slot_targeted;
  
  IF v_slot_targeted THEN
    v_day_of_week := EXTRACT(DOW FROM p_booking_date);
    
    IF NOT EXISTS(
      SELECT 1 FROM public.promo_time_slots 
      WHERE promo_code_id = v_promo.id 
        AND (day_of_week IS NULL OR day_of_week = v_day_of_week)
        AND p_start_time >= start_time 
        AND p_start_time < end_time
    ) THEN
      RETURN jsonb_build_object('valid', false, 'error', 'SLOT_NOT_TARGETED', 'message', 'Ce code promo n''est pas valide pour ce créneau horaire');
    END IF;
  END IF;

  -- 8. Succès - retourner les détails de la promo
  RETURN jsonb_build_object(
    'valid', true,
    'promo_id', v_promo.id,
    'name', v_promo.name,
    'discount_type', v_promo.discount_type,
    'discount_value', v_promo.discount_value,
    'is_automatic', v_promo.is_automatic
  );
END;
$$;

-- =====================================================
-- Fonction pour incrémenter l'usage après paiement
-- =====================================================
CREATE OR REPLACE FUNCTION public.record_promo_usage(
  p_promo_code_id UUID,
  p_user_id UUID,
  p_booking_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insérer l'usage
  INSERT INTO public.promo_usage (promo_code_id, user_id, booking_id)
  VALUES (p_promo_code_id, p_user_id, p_booking_id)
  ON CONFLICT (promo_code_id, booking_id) DO NOTHING;
  
  -- Incrémenter le compteur
  UPDATE public.promo_codes
  SET times_used = times_used + 1, updated_at = now()
  WHERE id = p_promo_code_id;
END;
$$;