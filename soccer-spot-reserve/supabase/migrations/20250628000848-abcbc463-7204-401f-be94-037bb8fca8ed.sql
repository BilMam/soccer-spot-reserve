
-- Table pour les notifications SMS
CREATE TABLE public.sms_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  phone_number TEXT NOT NULL,
  message_type TEXT NOT NULL, -- 'review_reminder', 'booking_confirmation', 'review_request'
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'sent', 'failed', 'delivered'
  error_message TEXT,
  sent_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table pour les préférences de notifications utilisateur
CREATE TABLE public.user_notification_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email_enabled BOOLEAN DEFAULT true,
  sms_enabled BOOLEAN DEFAULT false,
  push_enabled BOOLEAN DEFAULT true,
  review_reminders BOOLEAN DEFAULT true,
  booking_confirmations BOOLEAN DEFAULT true,
  marketing_notifications BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Table pour les rappels d'avis intelligents
CREATE TABLE public.review_reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reminder_type TEXT NOT NULL, -- 'immediate', '24h', '3days'
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'sent', 'cancelled'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(booking_id, reminder_type)
);

-- Table pour les catégories d'évaluation détaillées
CREATE TABLE public.review_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  review_id UUID NOT NULL REFERENCES public.reviews(id) ON DELETE CASCADE,
  category TEXT NOT NULL, -- 'cleanliness', 'equipment', 'location', 'service', 'value'
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table pour les badges utilisateur
CREATE TABLE public.user_badges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_type TEXT NOT NULL, -- 'reviewer', 'frequent_player', 'early_adopter'
  badge_name TEXT NOT NULL,
  description TEXT,
  earned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_visible BOOLEAN DEFAULT true
);

-- Ajouter les politiques RLS
ALTER TABLE public.sms_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

-- Politiques pour sms_notifications
CREATE POLICY "Users can view their own SMS notifications" 
ON public.sms_notifications FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "System can create SMS notifications" 
ON public.sms_notifications FOR INSERT 
WITH CHECK (true);

CREATE POLICY "System can update SMS notifications" 
ON public.sms_notifications FOR UPDATE 
USING (true);

-- Politiques pour user_notification_preferences
CREATE POLICY "Users can view their own notification preferences" 
ON public.user_notification_preferences FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own notification preferences" 
ON public.user_notification_preferences FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notification preferences" 
ON public.user_notification_preferences FOR UPDATE 
USING (auth.uid() = user_id);

-- Politiques pour review_reminders
CREATE POLICY "Users can view their own review reminders" 
ON public.review_reminders FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "System can manage review reminders" 
ON public.review_reminders FOR ALL 
USING (true);

-- Politiques pour review_categories
CREATE POLICY "Anyone can view review categories" 
ON public.review_categories FOR SELECT 
USING (true);

CREATE POLICY "Users can create categories for their own reviews" 
ON public.review_categories FOR INSERT 
WITH CHECK (
  auth.uid() IN (
    SELECT user_id FROM public.reviews WHERE id = review_id
  )
);

-- Politiques pour user_badges
CREATE POLICY "Anyone can view visible user badges" 
ON public.user_badges FOR SELECT 
USING (is_visible = true);

CREATE POLICY "Users can view their own badges" 
ON public.user_badges FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "System can award badges" 
ON public.user_badges FOR INSERT 
WITH CHECK (true);

-- Fonction pour programmer les rappels d'avis
CREATE OR REPLACE FUNCTION public.schedule_review_reminders(p_booking_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  booking_record RECORD;
  booking_end_time TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Récupérer les détails de la réservation
  SELECT b.*, p.id as profile_user_id
  INTO booking_record
  FROM public.bookings b
  JOIN public.profiles p ON b.user_id = p.id
  WHERE b.id = p_booking_id;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  -- Calculer la fin de la réservation
  booking_end_time := (booking_record.booking_date + booking_record.end_time::TIME)::TIMESTAMP WITH TIME ZONE;
  
  -- Programmer les rappels
  INSERT INTO public.review_reminders (booking_id, user_id, reminder_type, scheduled_for)
  VALUES 
    (p_booking_id, booking_record.user_id, 'immediate', booking_end_time + INTERVAL '1 hour'),
    (p_booking_id, booking_record.user_id, '24h', booking_end_time + INTERVAL '24 hours'),
    (p_booking_id, booking_record.user_id, '3days', booking_end_time + INTERVAL '3 days')
  ON CONFLICT (booking_id, reminder_type) DO NOTHING;
END;
$$;

-- Déclencheur pour programmer automatiquement les rappels
CREATE OR REPLACE FUNCTION public.trigger_schedule_review_reminders()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Programmer les rappels quand une réservation passe à 'completed'
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    PERFORM public.schedule_review_reminders(NEW.id);
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER booking_review_reminders_trigger
  AFTER UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.trigger_schedule_review_reminders();

-- Fonction pour attribuer des badges automatiquement
CREATE OR REPLACE FUNCTION public.award_reviewer_badge(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  review_count INTEGER;
BEGIN
  -- Compter les avis de l'utilisateur
  SELECT COUNT(*) INTO review_count
  FROM public.reviews
  WHERE user_id = p_user_id;
  
  -- Attribuer le badge "Contributeur" après 3 avis
  IF review_count >= 3 THEN
    INSERT INTO public.user_badges (user_id, badge_type, badge_name, description)
    VALUES (p_user_id, 'reviewer', 'Contributeur', 'A laissé au moins 3 avis utiles')
    ON CONFLICT DO NOTHING;
  END IF;
  
  -- Attribuer le badge "Expert" après 10 avis
  IF review_count >= 10 THEN
    INSERT INTO public.user_badges (user_id, badge_type, badge_name, description)
    VALUES (p_user_id, 'expert_reviewer', 'Expert Avis', 'A contribué avec plus de 10 avis détaillés')
    ON CONFLICT DO NOTHING;
  END IF;
END;
$$;

-- Déclencheur pour attribuer les badges automatiquement
CREATE OR REPLACE FUNCTION public.trigger_award_badges()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM public.award_reviewer_badge(NEW.user_id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER review_badge_trigger
  AFTER INSERT ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.trigger_award_badges();
