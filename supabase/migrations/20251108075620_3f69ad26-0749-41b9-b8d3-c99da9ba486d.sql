-- Créer la table de journalisation des remboursements
CREATE TABLE IF NOT EXISTS public.refund_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contribution_id UUID NOT NULL REFERENCES public.cagnotte_contribution(id) ON DELETE CASCADE,
  cagnotte_id UUID NOT NULL REFERENCES public.cagnotte(id) ON DELETE CASCADE,
  amount NUMERIC(10, 2) NOT NULL,
  phone_number TEXT NOT NULL,
  provider TEXT NOT NULL,
  refund_reference TEXT,
  paydunya_status TEXT,
  refund_status TEXT NOT NULL,
  attempt_number INTEGER DEFAULT 1,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour rechercher rapidement les logs par contribution
CREATE INDEX idx_refund_logs_contribution ON public.refund_logs(contribution_id);

-- Index pour rechercher par cagnotte
CREATE INDEX idx_refund_logs_cagnotte ON public.refund_logs(cagnotte_id);

-- Index pour rechercher par référence PayDunya
CREATE INDEX idx_refund_logs_reference ON public.refund_logs(refund_reference);

-- Index pour rechercher par date
CREATE INDEX idx_refund_logs_created_at ON public.refund_logs(created_at DESC);

-- RLS: Permettre aux admins de voir tous les logs
ALTER TABLE public.refund_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all refund logs"
  ON public.refund_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('super_admin', 'admin_general')
      AND is_active = true
    )
  );

-- Les propriétaires peuvent voir les remboursements de leurs cagnottes
CREATE POLICY "Owners can view their refund logs"
  ON public.refund_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.cagnotte c
      INNER JOIN public.fields f ON c.field_id = f.id
      WHERE c.id = refund_logs.cagnotte_id
      AND f.owner_id = auth.uid()
    )
  );

-- Service role peut tout faire (pour les edge functions)
CREATE POLICY "Service role can manage refund logs"
  ON public.refund_logs
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

COMMENT ON TABLE public.refund_logs IS 'Journal des remboursements de contributions de cagnottes - traçabilité complète';
COMMENT ON COLUMN public.refund_logs.contribution_id IS 'Référence à la contribution remboursée';
COMMENT ON COLUMN public.refund_logs.phone_number IS 'Numéro de téléphone du bénéficiaire (format normalisé)';
COMMENT ON COLUMN public.refund_logs.provider IS 'Provider mobile money (wave-ci, orange-money-ci, mtn-ci, moov-ci)';
COMMENT ON COLUMN public.refund_logs.refund_reference IS 'Référence du remboursement chez PayDunya';
COMMENT ON COLUMN public.refund_logs.attempt_number IS 'Numéro de tentative de remboursement';