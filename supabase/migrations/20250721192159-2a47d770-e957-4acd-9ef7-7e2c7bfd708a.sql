-- Ajouter la colonne payout_account_id à la table fields
ALTER TABLE public.fields
ADD COLUMN IF NOT EXISTS payout_account_id uuid
  REFERENCES public.payout_accounts(id) ON DELETE RESTRICT;

-- Créer un index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_fields_payout_account ON public.fields(payout_account_id);

-- Politique RLS pour s'assurer que l'owner ne peut créer un terrain qu'avec son propre compte de paiement
CREATE POLICY "Owner creates field with own payout" ON public.fields
FOR INSERT WITH CHECK (
  owner_id = auth.uid() AND
  (payout_account_id IS NULL OR payout_account_id IN (
    SELECT id FROM public.payout_accounts
    WHERE owner_id = auth.uid() AND is_active = true
  ))
);

-- Politique RLS pour la mise à jour (même logique)
CREATE POLICY "Owner updates field with own payout" ON public.fields
FOR UPDATE USING (
  owner_id = auth.uid()
) WITH CHECK (
  owner_id = auth.uid() AND
  (payout_account_id IS NULL OR payout_account_id IN (
    SELECT id FROM public.payout_accounts
    WHERE owner_id = auth.uid() AND is_active = true
  ))
);