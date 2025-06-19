
-- Ajouter des colonnes pour la gestion avancée des créneaux
ALTER TABLE public.field_availability 
ADD COLUMN IF NOT EXISTS unavailability_reason TEXT,
ADD COLUMN IF NOT EXISTS is_maintenance BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS created_by UUID,
ADD COLUMN IF NOT EXISTS period_template_id UUID;

-- Créer une table pour les templates de périodes
CREATE TABLE IF NOT EXISTS public.availability_period_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  field_id UUID NOT NULL REFERENCES public.fields(id) ON DELETE CASCADE,
  template_name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  default_start_time TIME NOT NULL,
  default_end_time TIME NOT NULL,
  apply_pattern TEXT DEFAULT 'all_days',
  excluded_days INTEGER[] DEFAULT '{}',
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_availability_period_templates_field ON public.availability_period_templates(field_id);
CREATE INDEX IF NOT EXISTS idx_field_availability_period ON public.field_availability(field_id, date, is_available);

-- Activer RLS sur la nouvelle table
ALTER TABLE public.availability_period_templates ENABLE ROW LEVEL SECURITY;

-- Politique pour que les propriétaires puissent gérer leurs templates
CREATE POLICY "Owners can manage their period templates" ON public.availability_period_templates
  FOR ALL USING (
    field_id IN (
      SELECT id FROM public.fields WHERE owner_id = auth.uid()
    )
  );

-- Fonction pour créer des créneaux en lot pour une période
CREATE OR REPLACE FUNCTION public.create_availability_for_period(
  p_field_id UUID,
  p_start_date DATE,
  p_end_date DATE,
  p_start_time TIME,
  p_end_time TIME,
  p_slot_duration INTEGER DEFAULT 30,
  p_exclude_days INTEGER[] DEFAULT '{}',
  p_template_id UUID DEFAULT NULL
) RETURNS INTEGER AS $$
DECLARE
  loop_date DATE;
  slot_time TIME;
  end_time_minutes INTEGER;
  current_minutes INTEGER;
  slot_count INTEGER := 0;
  day_of_week INTEGER;
BEGIN
  -- Supprimer les créneaux existants pour cette période
  DELETE FROM public.field_availability 
  WHERE field_id = p_field_id 
    AND date BETWEEN p_start_date AND p_end_date;
  
  -- Boucle sur chaque jour de la période
  loop_date := p_start_date;
  WHILE loop_date <= p_end_date LOOP
    -- Vérifier si ce jour est exclu
    day_of_week := EXTRACT(DOW FROM loop_date);
    
    IF NOT (day_of_week = ANY(p_exclude_days)) THEN
      -- Convertir les heures en minutes pour faciliter les calculs
      end_time_minutes := EXTRACT(HOUR FROM p_end_time) * 60 + EXTRACT(MINUTE FROM p_end_time);
      current_minutes := EXTRACT(HOUR FROM p_start_time) * 60 + EXTRACT(MINUTE FROM p_start_time);
      
      -- Créer les créneaux pour cette journée
      WHILE current_minutes < end_time_minutes LOOP
        slot_time := (current_minutes / 60)::INTEGER * INTERVAL '1 hour' + 
                     (current_minutes % 60)::INTEGER * INTERVAL '1 minute';
        
        INSERT INTO public.field_availability (
          field_id,
          date,
          start_time,
          end_time,
          is_available,
          period_template_id,
          created_by
        ) VALUES (
          p_field_id,
          loop_date,
          slot_time,
          slot_time + (p_slot_duration * INTERVAL '1 minute'),
          true,
          p_template_id,
          auth.uid()
        );
        
        slot_count := slot_count + 1;
        current_minutes := current_minutes + p_slot_duration;
      END LOOP;
    END IF;
    
    loop_date := loop_date + INTERVAL '1 day';
  END LOOP;
  
  RETURN slot_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour marquer des créneaux comme indisponibles
CREATE OR REPLACE FUNCTION public.set_slots_unavailable(
  p_field_id UUID,
  p_date DATE,
  p_start_time TIME,
  p_end_time TIME,
  p_reason TEXT DEFAULT 'Maintenance',
  p_notes TEXT DEFAULT NULL
) RETURNS INTEGER AS $$
DECLARE
  affected_count INTEGER;
BEGIN
  UPDATE public.field_availability
  SET 
    is_available = false,
    unavailability_reason = p_reason,
    notes = p_notes,
    is_maintenance = true,
    updated_at = now()
  WHERE field_id = p_field_id
    AND date = p_date
    AND start_time >= p_start_time
    AND end_time <= p_end_time;
  
  GET DIAGNOSTICS affected_count = ROW_COUNT;
  RETURN affected_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
