
-- Phase 2: Automatisation des transferts et timeouts

-- 1. Créer une table pour les tâches d'automatisation
CREATE TABLE IF NOT EXISTS public.escrow_automation_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  task_type TEXT NOT NULL CHECK (task_type IN ('auto_transfer', 'auto_refund', 'reminder_notification')),
  scheduled_at TIMESTAMPTZ NOT NULL,
  executed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'executed', 'failed', 'cancelled')),
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Ajouter des colonnes pour tracker les confirmations propriétaires
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS owner_confirmation_sent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS final_reminder_sent_at TIMESTAMPTZ;

-- 3. Fonction pour programmer une tâche d'automatisation
CREATE OR REPLACE FUNCTION public.schedule_escrow_task(
  p_booking_id UUID,
  p_task_type TEXT,
  p_scheduled_at TIMESTAMPTZ
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_task_id UUID;
BEGIN
  -- Annuler toute tâche existante du même type pour cette réservation
  UPDATE public.escrow_automation_tasks
  SET status = 'cancelled', updated_at = NOW()
  WHERE booking_id = p_booking_id 
    AND task_type = p_task_type 
    AND status = 'pending';
  
  -- Créer la nouvelle tâche
  INSERT INTO public.escrow_automation_tasks (
    booking_id, task_type, scheduled_at
  ) VALUES (
    p_booking_id, p_task_type, p_scheduled_at
  ) RETURNING id INTO v_task_id;
  
  RETURN v_task_id;
END;
$$;

-- 4. Fonction pour confirmer une réservation par le propriétaire
CREATE OR REPLACE FUNCTION public.confirm_booking_by_owner(
  p_booking_id UUID,
  p_owner_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_booking RECORD;
BEGIN
  -- Vérifier que la réservation existe et appartient au propriétaire
  SELECT b.*, f.owner_id
  INTO v_booking
  FROM public.bookings b
  JOIN public.fields f ON b.field_id = f.id
  WHERE b.id = p_booking_id AND f.owner_id = p_owner_id;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Vérifier que la réservation est dans le bon état
  IF v_booking.escrow_status != 'funds_held' OR v_booking.status != 'confirmed' THEN
    RETURN FALSE;
  END IF;
  
  -- Confirmer la réservation
  UPDATE public.bookings
  SET 
    owner_confirmed_at = NOW(),
    status = 'owner_confirmed',
    updated_at = NOW()
  WHERE id = p_booking_id;
  
  -- Programmer le transfert immédiat
  PERFORM public.schedule_escrow_task(
    p_booking_id,
    'auto_transfer',
    NOW() + INTERVAL '5 minutes' -- Délai de sécurité
  );
  
  -- Annuler les tâches de remboursement automatique
  UPDATE public.escrow_automation_tasks
  SET status = 'cancelled', updated_at = NOW()
  WHERE booking_id = p_booking_id 
    AND task_type = 'auto_refund'
    AND status = 'pending';
  
  RETURN TRUE;
END;
$$;

-- 5. Fonction pour traiter les tâches d'automatisation
CREATE OR REPLACE FUNCTION public.process_automation_tasks()
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
      SELECT * INTO v_booking
      FROM public.bookings
      WHERE id = v_task.booking_id;
      
      IF v_task.task_type = 'auto_transfer' THEN
        -- Vérifier que la réservation est confirmée par le propriétaire
        IF v_booking.owner_confirmed_at IS NOT NULL THEN
          -- Créer la transaction de transfert
          PERFORM public.process_escrow_transaction(
            v_task.booking_id,
            'transfer_to_owner',
            v_booking.owner_amount,
            v_booking.cinetpay_transaction_id
          );
          
          -- Marquer la réservation comme terminée
          UPDATE public.bookings
          SET 
            status = 'completed',
            transfer_scheduled_at = NOW(),
            updated_at = NOW()
          WHERE id = v_task.booking_id;
          
          v_result := 'transfer_completed';
        ELSE
          v_result := 'transfer_skipped_not_confirmed';
        END IF;
        
      ELSIF v_task.task_type = 'auto_refund' THEN
        -- Vérifier que la deadline est dépassée et pas de confirmation
        IF v_booking.confirmation_deadline < NOW() 
           AND v_booking.owner_confirmed_at IS NULL 
           AND NOT v_booking.auto_refund_processed THEN
          
          -- Créer la transaction de remboursement
          PERFORM public.process_escrow_transaction(
            v_task.booking_id,
            'refund_to_customer',
            v_booking.total_price,
            v_booking.cinetpay_transaction_id,
            v_booking.platform_fee
          );
          
          -- Marquer la réservation comme remboursée
          UPDATE public.bookings
          SET 
            status = 'refunded',
            auto_refund_processed = TRUE,
            updated_at = NOW()
          WHERE id = v_task.booking_id;
          
          v_result := 'refund_completed';
        ELSE
          v_result := 'refund_not_needed';
        END IF;
        
      ELSIF v_task.task_type = 'reminder_notification' THEN
        -- Marquer le rappel comme envoyé (sera traité par l'edge function)
        UPDATE public.bookings
        SET final_reminder_sent_at = NOW()
        WHERE id = v_task.booking_id;
        
        v_result := 'reminder_scheduled';
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

-- 6. Trigger pour programmer automatiquement les tâches escrow
CREATE OR REPLACE FUNCTION public.trigger_schedule_escrow_tasks()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Quand une réservation passe en statut 'confirmed' avec fonds en escrow
  IF NEW.status = 'confirmed' AND NEW.escrow_status = 'funds_held' 
     AND (OLD.status IS NULL OR OLD.status != 'confirmed') THEN
    
    -- Programmer le remboursement automatique après 24h
    PERFORM public.schedule_escrow_task(
      NEW.id,
      'auto_refund',
      NEW.confirmation_deadline
    );
    
    -- Programmer un rappel 2h avant la deadline
    PERFORM public.schedule_escrow_task(
      NEW.id,
      'reminder_notification',
      NEW.confirmation_deadline - INTERVAL '2 hours'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Créer le trigger
DROP TRIGGER IF EXISTS trigger_escrow_automation ON public.bookings;
CREATE TRIGGER trigger_escrow_automation
  AFTER UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_schedule_escrow_tasks();

-- 7. Index pour optimiser les requêtes d'automatisation
CREATE INDEX IF NOT EXISTS idx_escrow_automation_tasks_scheduled ON public.escrow_automation_tasks(status, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_escrow_automation_tasks_booking ON public.escrow_automation_tasks(booking_id, task_type);

-- 8. RLS pour la table d'automatisation
ALTER TABLE public.escrow_automation_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view automation tasks" ON public.escrow_automation_tasks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('super_admin', 'admin_general')
      AND is_active = true
    )
  );
