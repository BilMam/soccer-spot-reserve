-- Table pour les créneaux récurrents
CREATE TABLE IF NOT EXISTS public.recurring_slots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  field_id UUID NOT NULL REFERENCES public.fields(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  
  -- Configuration de la récurrence
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0 = Dimanche, 6 = Samedi
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  
  -- Période de validité
  start_date DATE NOT NULL,
  end_date DATE, -- NULL = indéfini
  
  -- Métadonnées
  is_active BOOLEAN DEFAULT true,
  label TEXT, -- Label optionnel (ex: "Entraînement du mardi")
  notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Contraintes
  CONSTRAINT valid_time_range CHECK (end_time > start_time),
  CONSTRAINT valid_date_range CHECK (end_date IS NULL OR end_date >= start_date)
);

-- Index pour optimiser les requêtes
CREATE INDEX idx_recurring_slots_field_id ON public.recurring_slots(field_id);
CREATE INDEX idx_recurring_slots_active ON public.recurring_slots(is_active) WHERE is_active = true;
CREATE INDEX idx_recurring_slots_day ON public.recurring_slots(day_of_week);

-- Commentaires
COMMENT ON TABLE public.recurring_slots IS 'Créneaux récurrents hebdomadaires pour les terrains';
COMMENT ON COLUMN public.recurring_slots.day_of_week IS 'Jour de la semaine (0=Dimanche, 1=Lundi, ..., 6=Samedi)';
COMMENT ON COLUMN public.recurring_slots.end_date IS 'Date de fin de la récurrence (NULL = indéfini)';

-- Activer RLS
ALTER TABLE public.recurring_slots ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Owners can view their recurring slots"
  ON public.recurring_slots FOR SELECT
  USING (
    field_id IN (
      SELECT id FROM public.fields WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Owners can create recurring slots"
  ON public.recurring_slots FOR INSERT
  WITH CHECK (
    field_id IN (
      SELECT id FROM public.fields WHERE owner_id = auth.uid()
    )
    AND created_by = auth.uid()
  );

CREATE POLICY "Owners can update their recurring slots"
  ON public.recurring_slots FOR UPDATE
  USING (
    field_id IN (
      SELECT id FROM public.fields WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Owners can delete their recurring slots"
  ON public.recurring_slots FOR DELETE
  USING (
    field_id IN (
      SELECT id FROM public.fields WHERE owner_id = auth.uid()
    )
  );

-- Fonction pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_recurring_slots_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_recurring_slots_updated_at
  BEFORE UPDATE ON public.recurring_slots
  FOR EACH ROW
  EXECUTE FUNCTION update_recurring_slots_updated_at();