
-- Phase 3: Système de confirmation intelligente adaptative

-- 1. Table pour les paramètres de la plateforme
CREATE TABLE IF NOT EXISTS public.platform_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT NOT NULL UNIQUE,
  setting_value TEXT NOT NULL,
  setting_type TEXT NOT NULL DEFAULT 'string' CHECK (setting_type IN ('string', 'number', 'boolean', 'json')),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insérer les paramètres de configuration pour la confirmation intelligente
INSERT INTO public.platform_settings (setting_key, setting_value, setting_type, description) VALUES
('AUTO_CONFIRM_LAST_MIN', 'true', 'boolean', 'Auto-confirmation pour les créneaux ≤ 1h'),
('WINDOW_EXPRESS_MINUTES', '10', 'number', 'Délai en minutes pour les créneaux 1h-6h'),
('WINDOW_SHORT_MINUTES', '30', 'number', 'Délai en minutes pour les créneaux 6h-24h'),
('WINDOW_STANDARD_HOURS', '24', 'number', 'Délai en heures pour les créneaux 24h-7j'),
('WINDOW_LONG_HOURS', '48', 'number', 'Délai en heures pour les créneaux > 7j')
ON CONFLICT (setting_key) DO NOTHING;

-- 2. Ajouter des colonnes pour la confirmation intelligente
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS time_until_slot INTERVAL,
ADD COLUMN IF NOT EXISTS confirmation_window_type TEXT CHECK (confirmation_window_type IN ('auto', 'express', 'short', 'standard', 'long')),
ADD COLUMN IF NOT EXISTS auto_action TEXT DEFAULT 'cancel' CHECK (auto_action IN ('confirm', 'cancel'));

-- 3. Fonction pour calculer le délai de confirmation intelligent
CREATE OR REPLACE FUNCTION public.calculate_smart_confirmation_deadline(
  p_booking_date DATE,
  p_start_time TIME
)
RETURNS RECORD
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_booking_datetime TIMESTAMPTZ;
  v_time_until_slot INTERVAL;
  v_window_type TEXT;
  v_deadline TIMESTAMPTZ;
  v_auto_action TEXT;
  v_settings RECORD;
BEGIN
  -- Calculer le datetime du créneau
  v_booking_datetime := (p_booking_date || ' ' || p_start_time)::TIMESTAMPTZ;
  v_time_until_slot := v_booking_datetime - NOW();
  
  -- Récupérer les paramètres
  SELECT 
    (SELECT setting_value::BOOLEAN FROM public.platform_settings WHERE setting_key = 'AUTO_CONFIRM_LAST_MIN') as auto_confirm,
    (SELECT setting_value::INTEGER FROM public.platform_settings WHERE setting_key = 'WINDOW_EXPRESS_MINUTES') as express_min,
    (SELECT setting_value::INTEGER FROM public.platform_settings WHERE setting_key = 'WINDOW_SHORT_MINUTES') as short_min,
    (SELECT setting_value::INTEGER FROM public.platform_settings WHERE setting_key = 'WINDOW_STANDARD_HOURS') as standard_hours,
    (SELECT setting_value::INTEGER FROM public.platform_settings WHERE setting_key = 'WINDOW_LONG_HOURS') as long_hours
  INTO v_settings;
  
  -- Déterminer le type de fenêtre et l'action
  IF v_time_until_slot <= INTERVAL '1 hour' THEN
    v_window_type := 'auto';
    v_deadline := NOW(); -- Immédiat
    v_auto_action := CASE WHEN v_settings.auto_confirm THEN 'confirm' ELSE 'cancel' END;
  ELSIF v_time_until_slot <= INTERVAL '6 hours' THEN
    v_window_type := 'express';
    v_deadline := NOW() + (v_settings.express_min || ' minutes')::INTERVAL;
    v_auto_action := 'confirm'; -- Auto-confirm si pas de réponse
  ELSIF v_time_until_slot <= INTERVAL '24 hours' THEN
    v_window_type := 'short';
    v_deadline := NOW() + (v_settings.short_min || ' minutes')::INTERVAL;
    v_auto_action := 'cancel';
  ELSIF v_time_until_slot <= INTERVAL '7 days' THEN
    v_window_type := 'standard';
    v_deadline := NOW() + (v_settings.standard_hours || ' hours')::INTERVAL;
    v_auto_action := 'cancel';
  ELSE
    v_window_type := 'long';
    v_deadline := NOW() + (v_settings.long_hours || ' hours')::INTERVAL;
    v_auto_action := 'cancel';
  END IF;
  
  RETURN (v_time_until_slot, v_window_type, v_deadline, v_auto_action);
END;
$$;

-- 4. Fonction pour traiter une réservation avec confirmation intelligente
CREATE OR REPLACE FUNCTION public.process_smart_booking_confirmation(
  p_booking_id UUID,
  p_transaction_type TEXT,
  p_amount DECIMAL(10,2),
  p_cinetpay_transaction_id TEXT DEFAULT NULL,
  p_platform_fee DECIMAL(10,2) DEFAULT 0
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_transaction_id UUID;
  v_booking RECORD;
  v_smart_deadline RECORD;
BEGIN
  -- Récupérer les informations de la réservation
  SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id;
  
  -- Calculer les délais intelligents
  SELECT * INTO v_smart_deadline 
  FROM public.calculate_smart_confirmation_deadline(v_booking.booking_date, v_booking.start_time) 
  AS (time_until_slot INTERVAL, window_type TEXT, deadline TIMESTAMPTZ, auto_action TEXT);
  
  -- Créer la transaction d'escrow
  v_transaction_id := public.process_escrow_transaction(
    p_booking_id, p_transaction_type, p_amount, p_cinetpay_transaction_id, p_platform_fee
  );
  
  -- Mettre à jour la réservation avec les informations intelligentes
  UPDATE public.bookings
  SET 
    time_until_slot = v_smart_deadline.time_until_slot,
    confirmation_window_type = v_smart_deadline.window_type,
    confirmation_deadline = v_smart_deadline.deadline,
    auto_action = v_smart_deadline.auto_action,
    updated_at = NOW()
  WHERE id = p_booking_id;
  
  -- Si auto-confirmation immédiate (≤ 1h)
  IF v_smart_deadline.window_type = 'auto' AND v_smart_deadline.auto_action = 'confirm' THEN
    UPDATE public.bookings
    SET 
      owner_confirmed_at = NOW(),
      status = 'owner_confirmed'
    WHERE id = p_booking_id;
    
    -- Programmer le transfert immédiat
    PERFORM public.schedule_escrow_task(p_booking_id, 'auto_transfer', NOW() + INTERVAL '5 minutes');
  ELSE
    -- Programmer les tâches d'automatisation selon le type de fenêtre
    IF v_smart_deadline.auto_action = 'confirm' THEN
      -- Pour express: auto-confirm si pas de réponse
      PERFORM public.schedule_escrow_task(p_booking_id, 'auto_confirm', v_smart_deadline.deadline);
    ELSE
      -- Pour short/standard/long: auto-refund si pas de réponse
      PERFORM public.schedule_escrow_task(p_booking_id, 'auto_refund', v_smart_deadline.deadline);
    END IF;
    
    -- Programmer les rappels selon la fenêtre
    IF v_smart_deadline.window_type = 'express' THEN
      -- SMS rappel à 7 min pour express (10 min total)
      PERFORM public.schedule_escrow_task(p_booking_id, 'sms_reminder', NOW() + INTERVAL '7 minutes');
    ELSIF v_smart_deadline.window_type = 'short' THEN
      -- SMS rappel à 20 min pour short (30 min total)
      PERFORM public.schedule_escrow_task(p_booking_id, 'sms_reminder', NOW() + INTERVAL '20 minutes');
    ELSIF v_smart_deadline.window_type = 'standard' THEN
      -- Email rappel à 12h pour standard (24h total)
      PERFORM public.schedule_escrow_task(p_booking_id, 'reminder_notification', NOW() + INTERVAL '12 hours');
      -- SMS rappel à 22h pour standard
      PERFORM public.schedule_escrow_task(p_booking_id, 'sms_reminder', NOW() + INTERVAL '22 hours');
    ELSIF v_smart_deadline.window_type = 'long' THEN
      -- Rappel J+1 pour long (48h total)
      PERFORM public.schedule_escrow_task(p_booking_id, 'reminder_notification', NOW() + INTERVAL '24 hours');
      -- Escalade support J+2-2h pour long
      PERFORM public.schedule_escrow_task(p_booking_id, 'support_escalation', v_smart_deadline.deadline - INTERVAL '2 hours');
    END IF;
  END IF;
  
  RETURN v_transaction_id;
END;
$$;

-- 5. Nouvelle tâche d'auto-confirmation
CREATE OR REPLACE FUNCTION public.process_smart_automation_tasks()
RETURNS TABLE(
  task_id UUID,
  booking_id UUID,
  task_type TEXT,
  result TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_task RECORD;
  v_booking RECORD;
  v_result TEXT;
BEGIN
  -- Récupérer les tâches prêtes à être exécutées
  FOR v_task IN 
    SELECT * FROM public.escrow_automation_tasks
    WHERE status = 'pending' 
      AND scheduled_at <= NOW()
      AND retry_count < max_retries
    ORDER BY scheduled_at ASC
    LIMIT 50
  LOOP
    BEGIN
      -- Marquer la tâche comme en cours de traitement
      UPDATE public.escrow_automation_tasks
      SET status = 'executing', updated_at = NOW()
      WHERE id = v_task.id;
      
      -- Récupérer les informations de la réservation
      SELECT * INTO v_booking FROM public.bookings WHERE id = v_task.booking_id;
      
      IF v_task.task_type = 'auto_confirm' THEN
        -- Auto-confirmation pour les fenêtres express
        IF v_booking.owner_confirmed_at IS NULL THEN
          UPDATE public.bookings
          SET 
            owner_confirmed_at = NOW(),
            status = 'owner_confirmed',
            updated_at = NOW()
          WHERE id = v_task.booking_id;
          
          -- Programmer le transfert
          PERFORM public.schedule_escrow_task(v_task.booking_id, 'auto_transfer', NOW() + INTERVAL '5 minutes');
          v_result := 'auto_confirmed';
        ELSE
          v_result := 'already_confirmed';
        END IF;
        
      ELSIF v_task.task_type = 'sms_reminder' THEN
        -- Marquer pour envoi SMS (sera traité par l'edge function)
        v_result := 'sms_reminder_scheduled';
        
      ELSIF v_task.task_type = 'support_escalation' THEN
        -- Marquer pour escalade support
        v_result := 'support_escalation_scheduled';
        
      ELSE
        -- Traitement des autres tâches existantes
        SELECT * INTO v_result FROM public.process_automation_tasks() 
        WHERE booking_id = v_task.booking_id AND task_type = v_task.task_type 
        LIMIT 1;
      END IF;
      
      -- Marquer la tâche comme exécutée
      UPDATE public.escrow_automation_tasks
      SET 
        status = 'executed',
        executed_at = NOW(),
        updated_at = NOW()
      WHERE id = v_task.id;
      
      -- Retourner le résultat
      task_id := v_task.id;
      booking_id := v_task.booking_id;
      task_type := v_task.task_type;
      result := v_result;
      RETURN NEXT;
      
    EXCEPTION WHEN OTHERS THEN
      -- En cas d'erreur, incrémenter le compteur de retry
      UPDATE public.escrow_automation_tasks
      SET 
        status = CASE 
          WHEN retry_count + 1 >= max_retries THEN 'failed'
          ELSE 'pending'
        END,
        retry_count = retry_count + 1,
        error_message = SQLERRM,
        scheduled_at = CASE 
          WHEN retry_count + 1 < max_retries THEN NOW() + INTERVAL '30 minutes'
          ELSE scheduled_at
        END,
        updated_at = NOW()
      WHERE id = v_task.id;
      
      task_id := v_task.id;
      booking_id := v_task.booking_id;
      task_type := v_task.task_type;
      result := 'error: ' || SQLERRM;
      RETURN NEXT;
    END;
  END LOOP;
END;
$$;

-- 6. Index pour optimiser les nouvelles requêtes
CREATE INDEX IF NOT EXISTS idx_bookings_window_type ON public.bookings(confirmation_window_type);
CREATE INDEX IF NOT EXISTS idx_platform_settings_key ON public.platform_settings(setting_key);

-- 7. RLS pour platform_settings
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage platform settings" ON public.platform_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('super_admin', 'admin_general')
      AND is_active = true
    )
  );

CREATE POLICY "Everyone can read platform settings" ON public.platform_settings
  FOR SELECT USING (true);
