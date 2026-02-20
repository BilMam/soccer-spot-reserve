-- Corriger les fonctions RPC pour traiter minuit (00:00) comme fin de journée (1440 minutes)
-- Cela permet un vrai mode 24h/24 avec 48 créneaux de 30 min au lieu de 47

-- 1. Fonction avec horaires spécifiques par jour
CREATE OR REPLACE FUNCTION public.create_availability_for_period_with_day_specific_times(
  p_field_id UUID,
  p_start_date DATE,
  p_end_date DATE,
  p_slot_duration INTEGER,
  p_slots_to_create JSONB
) RETURNS INTEGER AS $$
DECLARE
  slot JSONB;
  day_of_week INT;
  start_time TIME;
  end_time TIME;
  loop_date DATE;
  slot_time TIME;
  end_time_minutes INTEGER;
  current_minutes INTEGER;
  total_created INTEGER := 0;
BEGIN
  -- Supprimer les créneaux existants pour cette période
  DELETE FROM public.field_availability
  WHERE field_id = p_field_id
    AND date BETWEEN p_start_date AND p_end_date;

  -- Parcourir chaque configuration de jour
  FOR slot IN SELECT * FROM jsonb_array_elements(p_slots_to_create)
  LOOP
    day_of_week := (slot->>'dayOfWeek')::INT;
    start_time := (slot->>'start')::TIME;
    end_time := (slot->>'end')::TIME;

    -- Parcourir chaque jour de la période
    loop_date := p_start_date;
    WHILE loop_date <= p_end_date LOOP
      -- Vérifier si ce jour correspond au jour de la semaine configuré
      IF EXTRACT(DOW FROM loop_date) = day_of_week THEN
        -- Convertir les heures en minutes pour faciliter les calculs
        end_time_minutes := EXTRACT(HOUR FROM end_time) * 60 + EXTRACT(MINUTE FROM end_time);
        current_minutes := EXTRACT(HOUR FROM start_time) * 60 + EXTRACT(MINUTE FROM start_time);

        -- Traiter minuit (00:00) comme fin de journée = 1440 minutes (24h/24)
        IF end_time_minutes = 0 THEN
          end_time_minutes := 1440;
        END IF;

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
            created_by
          ) VALUES (
            p_field_id,
            loop_date,
            slot_time,
            slot_time + (p_slot_duration * INTERVAL '1 minute'),
            true,
            auth.uid()
          );

          total_created := total_created + 1;
          current_minutes := current_minutes + p_slot_duration;
        END LOOP;
      END IF;

      loop_date := loop_date + INTERVAL '1 day';
    END LOOP;
  END LOOP;

  RETURN total_created;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Fonction originale (sans horaires spécifiques par jour)
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

      -- Traiter minuit (00:00) comme fin de journée = 1440 minutes (24h/24)
      IF end_time_minutes = 0 THEN
        end_time_minutes := 1440;
      END IF;

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
