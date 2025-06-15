
-- Créer une table pour les liens de paiement
CREATE TABLE IF NOT EXISTS public.payment_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '48 hours'),
  created_at TIMESTAMPTZ DEFAULT now(),
  used_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true
);

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_payment_links_token ON public.payment_links(token);
CREATE INDEX IF NOT EXISTS idx_payment_links_booking_id ON public.payment_links(booking_id);

-- RLS pour les liens de paiement
ALTER TABLE public.payment_links ENABLE ROW LEVEL SECURITY;

-- Politique pour que les utilisateurs puissent voir leurs propres liens
CREATE POLICY "Users can view their own payment links" ON public.payment_links
  FOR SELECT USING (
    booking_id IN (
      SELECT id FROM public.bookings WHERE user_id = auth.uid()
    )
  );

-- Politique pour que les propriétaires puissent créer des liens pour leurs terrains
CREATE POLICY "Owners can create payment links for their fields" ON public.payment_links
  FOR INSERT WITH CHECK (
    booking_id IN (
      SELECT b.id FROM public.bookings b
      JOIN public.fields f ON b.field_id = f.id
      WHERE f.owner_id = auth.uid()
    )
  );
