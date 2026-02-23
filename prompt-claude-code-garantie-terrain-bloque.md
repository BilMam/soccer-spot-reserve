# Prompt Claude Code — Implémentation Garantie Terrain Bloqué pour PISport

Tu es un développeur senior spécialisé React/TypeScript + Supabase. Tu dois implémenter la feature "Garantie Terrain Bloqué" dans le repo PISport (soccer-spot-reserve).

Dossier : ~/MySport/soccer-spot-reserve

## Contexte
PISport est une plateforme de réservation de terrains de sport à Abidjan.
Stack : React + TypeScript (Vite), Supabase (PostgreSQL + Edge Functions Deno), PayDunya (Mobile Money).

Modèle économique actuel :
- Le propriétaire définit son prix NET (ex: 35,000 XOF)
- Prix PUBLIC = roundToCommercialPrice(net / (1 - 0.03))
- Commission PISport = 3% sur paiement complet
- Logique dans : src/utils/publicPricing.ts

## Feature à implémenter : Paiement en 2 temps

### 3 modes propriétaire (payment_mode)
- full : paiement 100% en ligne (comportement actuel — NE PAS TOUCHER)
- guarantee : acompte en ligne uniquement
- both : le joueur choisit

### Formules financières EXACTES
TAUX_COMMISSION_GARANTIE = 0.10 (10%)
POURCENTAGE_ACOMPTE = 0.20 (20%) par défaut

acompte_net_proprio = net_terrain x 0.20
acompte_public = roundToCommercialPrice(acompte_net_proprio / 0.90)
solde_cash = net_terrain x 0.80

Exemple (net = 35,000) :
- acompte_net = 7,000 XOF
- acompte_public = roundCommercial(7,777.78) = 8,000 XOF
- commission PISport = 1,000 XOF
- solde cash = 28,000 XOF
- proprio recoit total = 35,000 XOF EXACTEMENT

### PHASE 1 — Migrations DB
ALTER TABLE public.fields ADD COLUMN IF NOT EXISTS guarantee_enabled boolean DEFAULT false, ADD COLUMN IF NOT EXISTS guarantee_percentage integer DEFAULT 20, ADD COLUMN IF NOT EXISTS payment_mode text DEFAULT 'full' CHECK (payment_mode IN ('full', 'guarantee', 'both'));

ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS payment_type text DEFAULT 'full' CHECK (payment_type IN ('full', 'deposit')), ADD COLUMN IF NOT EXISTS deposit_amount numeric(10,2), ADD COLUMN IF NOT EXISTS deposit_public_price numeric(10,2), ADD COLUMN IF NOT EXISTS balance_due numeric(10,2), ADD COLUMN IF NOT EXISTS deposit_paid boolean DEFAULT false, ADD COLUMN IF NOT EXISTS balance_paid boolean DEFAULT false, ADD COLUMN IF NOT EXISTS guarantee_commission_rate numeric(4,2) DEFAULT 0.10;

### PHASE 2 — src/utils/publicPricing.ts
Ajouter (sans modifier l'existant) :
- GUARANTEE_COMMISSION_RATE = 0.10
- calculateGuaranteePublicPrice(netDepositAmount)
- calculateGuaranteeBreakdown(netPriceOwner, guaranteePercentage=0.20)

### PHASE 3 — Frontend
- Nouveau composant PaymentTypeSelector.tsx (sélecteur full/deposit)
- Modifier SlotBookingInterface.tsx (ajouter state paymentType)
- Modifier BookingSummary.tsx (afficher acompte + solde cash si deposit)
- Modifier SlotBookingActions.tsx (bouton "Bloquer le terrain")
- Modifier FieldDetail.tsx (passer les nouveaux champs)
- Modifier useCreateBookingWithPayment.ts (stocker payment_type, deposit_amount, etc.)

### PHASE 4 — Edge Functions
- create-paydunya-invoice : si deposit, facturer acompte_public seulement
- paydunya-ipn : si deposit, mettre deposit_paid=true, status=confirmed
- create-paydunya-payout : si deposit, payout = deposit_amount uniquement

### PHASE 5 — Dashboard proprio
- EditFieldForm.tsx : section mode paiement avec toggle + apercu montants
- BookingSuccess.tsx : message special si deposit ("Terrain bloque !")

### PHASE 6 — Types
- Mettre a jour src/types/pricing.ts
- npx supabase gen types typescript

### Regles absolues
1. NE JAMAIS casser le mode full existant
2. Toujours verifier : proprio recoit exactement son net total
3. Apres chaque phase : git add -A && git commit -m "feat: Phase X" && git push origin main
4. Textes UI en francais
5. Mobile first, shadcn/ui + Tailwind

Commence par la Phase 1. Montre chaque fichier modifie. Push apres chaque phase.
