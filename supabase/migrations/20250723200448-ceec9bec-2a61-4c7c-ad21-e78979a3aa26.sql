-- Migration: Nettoyage et optimisation flux payout automatique
-- Supprimer les colonnes obsolètes et ajouter les champs manquants

-- 1. Nettoyer les colonnes obsolètes
ALTER TABLE public.bookings DROP COLUMN IF EXISTS cinetpay_checkout_fee;

-- 2. Ajouter le contrôle de payout automatique  
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS payout_sent BOOLEAN DEFAULT FALSE;

-- 3. Optimiser la table payouts
ALTER TABLE public.payouts ADD COLUMN IF NOT EXISTS amount_net NUMERIC;
ALTER TABLE public.payouts ADD COLUMN IF NOT EXISTS sent_at TIMESTAMP WITH TIME ZONE;

-- 4. Fonction pour déclencher le payout automatique
CREATE OR REPLACE FUNCTION public.trigger_auto_payout()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Déclencher payout automatique quand payment_status passe à 'paid'
  IF NEW.payment_status = 'paid' AND NEW.payout_sent = FALSE 
     AND (OLD.payment_status IS NULL OR OLD.payment_status != 'paid') THEN
    
    -- Appeler la fonction de payout en arrière-plan
    PERFORM public.schedule_owner_payout(NEW.id);
  END IF;
  
  RETURN NEW;
END;
$$;

-- 5. Fonction pour programmer le payout
CREATE OR REPLACE FUNCTION public.schedule_owner_payout(p_booking_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  booking_record RECORD;
  owner_record RECORD;
  payout_exists BOOLEAN;
BEGIN
  -- Vérifier si un payout existe déjà (idempotence)
  SELECT EXISTS(
    SELECT 1 FROM public.payouts 
    WHERE booking_id = p_booking_id
  ) INTO payout_exists;
  
  IF payout_exists THEN
    RETURN; -- Payout déjà créé
  END IF;
  
  -- Récupérer les détails de la réservation
  SELECT b.*, f.owner_id
  INTO booking_record
  FROM public.bookings b
  JOIN public.fields f ON b.field_id = f.id
  WHERE b.id = p_booking_id
    AND b.payment_status = 'paid'
    AND b.payout_sent = FALSE;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  -- Calculer le montant net propriétaire (95% du prix terrain)
  -- owner_amount était déjà calculé dans create-cinetpay-payment
  
  -- Créer le payout en attente
  INSERT INTO public.payouts (
    booking_id,
    owner_id,
    amount,
    amount_net,
    platform_fee_owner,
    status,
    created_at,
    updated_at
  ) VALUES (
    p_booking_id,
    booking_record.owner_id,
    booking_record.owner_amount,
    booking_record.owner_amount,
    booking_record.platform_fee_owner,
    'pending',
    NOW(),
    NOW()
  );
  
  -- Marquer comme traité pour éviter les doublons
  UPDATE public.bookings 
  SET payout_sent = TRUE
  WHERE id = p_booking_id;
  
  -- Log pour debugging
  RAISE NOTICE 'Payout scheduled for booking % amount %', p_booking_id, booking_record.owner_amount;
END;
$$;

-- 6. Créer le trigger
DROP TRIGGER IF EXISTS trigger_auto_payout_on_payment ON public.bookings;
CREATE TRIGGER trigger_auto_payout_on_payment
  AFTER UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_auto_payout();

-- 7. Mettre à jour les payouts existants avec amount_net
UPDATE public.payouts 
SET amount_net = amount 
WHERE amount_net IS NULL;

-- 8. Ajouter les contraintes
ALTER TABLE public.payouts 
ADD CONSTRAINT check_positive_amount_net 
CHECK (amount_net > 0);

-- 9. Commentaires pour documentation
COMMENT ON COLUMN public.bookings.payout_sent IS 'Indique si le payout automatique a été déclenché pour éviter les doublons';
COMMENT ON COLUMN public.payouts.amount_net IS 'Montant net versé au propriétaire (95% du prix terrain)';
COMMENT ON COLUMN public.payouts.sent_at IS 'Timestamp de confirmation du transfert CinetPay';
COMMENT ON FUNCTION public.trigger_auto_payout() IS 'Déclenche automatiquement le payout quand payment_status = paid';
COMMENT ON FUNCTION public.schedule_owner_payout(UUID) IS 'Créé un payout en attente de façon idempotente';