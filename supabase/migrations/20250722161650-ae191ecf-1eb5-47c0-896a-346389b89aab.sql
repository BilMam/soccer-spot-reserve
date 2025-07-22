-- Créer la table payment_anomalies pour tracking des problèmes de paiement
CREATE TABLE IF NOT EXISTS public.payment_anomalies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  payment_intent_id TEXT NOT NULL,
  amount INTEGER NOT NULL,
  error_type TEXT NOT NULL,
  error_message TEXT NOT NULL,
  webhook_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE
);

-- Index pour les recherches par payment_intent_id
CREATE INDEX IF NOT EXISTS idx_payment_anomalies_payment_intent_id 
ON public.payment_anomalies(payment_intent_id);

-- Index pour les recherches par error_type
CREATE INDEX IF NOT EXISTS idx_payment_anomalies_error_type 
ON public.payment_anomalies(error_type);

-- RLS pour les admins seulement
ALTER TABLE public.payment_anomalies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "System can manage payment anomalies" 
ON public.payment_anomalies 
FOR ALL 
USING (true);