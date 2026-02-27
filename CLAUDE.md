# PISport - Plateforme de Reservation de Terrains de Sport

## Apercu du Projet

PISport est une plateforme de reservation de terrains de football en Cote d'Ivoire et Afrique de l'Ouest. Les joueurs reservent et paient des creneaux, les proprietaires gerent leurs terrains et recoivent les paiements, les admins supervisent la plateforme.

**URL de production** : https://pisport.app
**Deploiement** : Lovable / Vercel
**Projet Supabase** : `zldawmyoscicxoiqvfpu`

## Stack Technique

- **Frontend** : React 18 + TypeScript + Vite (SWC) + Tailwind CSS + Shadcn/UI
- **Backend** : Supabase (PostgreSQL, Auth, Edge Functions Deno, Storage, Realtime)
- **Paiements** : CinetPay (Mobile Money : Orange Money, MTN Money, Moov Money) + Paydunya
- **Cartes** : Google Maps API
- **Tests** : Jest + React Testing Library
- **PWA** : vite-plugin-pwa avec auto-update

## Structure du Code

```
src/
  pages/           # 24 pages (Index, Auth, Search, FieldDetail, OwnerDashboard, AdminDashboard, etc.)
  components/      # 150+ composants organises par feature
    admin/         # Dashboard admin, gestion proprietaires, geocoding
    availability/  # Gestion des creneaux et disponibilites (20+ fichiers)
    calendar/      # Interface de reservation et selection de creneaux
    chat/          # Messagerie entre joueurs et proprietaires
    forms/         # Formulaires de creation/edition de terrain
    owner/         # OTP, comptes de paiement proprietaire
    promotions/    # Codes promo et wizard de creation
    search/        # Recherche avec Google Maps, filtres, toggle vue
    super-admin/   # Gestion users, audit logs
    ui/            # Composants Shadcn/UI (50+) + custom (PhoneInputCI, ScrollableTabsList)
  hooks/           # 37 hooks custom (auth, bookings, availability, promotions, chat, etc.)
  types/           # Types TypeScript (admin, chat, pricing, search)
  utils/           # 23 utilitaires (pricing, geocoding, phone, slots, search)
  integrations/    # Client Supabase + types auto-generes (2500+ lignes)
  constants/       # Definitions des sports
  lib/             # Config Supabase, URLs, utils

supabase/
  functions/       # 30 Edge Functions Deno
  migrations/      # 180+ migrations SQL
  config.toml      # Config Supabase
  schedule.yaml    # Cron jobs (check-cinetpay-transfers: 15min, cleanup-cagnottes: 1min)
```

## Conventions et Regles

### Alias d'import
- Utilise TOUJOURS `@/` pour les imports depuis `src/` (ex: `import { Button } from "@/components/ui/button"`)

### Composants
- Composants fonctionnels React avec hooks
- Shadcn/UI pour tous les composants UI de base (ne PAS reinventer)
- Tailwind CSS pour le styling (classes utilitaires, pas de CSS custom)
- Dark mode supporte via classes (class-based)

### TypeScript
- Types stricts, pas de `any` sauf cas justifie
- Les types Supabase sont auto-generes dans `src/integrations/supabase/types.ts` - NE PAS modifier manuellement
- Types custom dans `src/types/`

### State Management
- React Query (@tanstack/react-query) pour le state serveur
- React hooks (useState, useContext) pour le state local
- Pas de Redux ou store global

### Routing
- React Router v6 (react-router-dom)
- SPA avec rewrite vers index.html (vercel.json)

### Formulaires
- React Hook Form + Zod pour la validation
- Hook `useForm` avec `zodResolver`

### Supabase
- Client initialise dans `src/integrations/supabase/client.ts`
- RLS (Row Level Security) active sur toutes les tables
- Edge Functions en Deno/TypeScript
- La plupart des Edge Functions ont `verify_jwt = false` (authentification geree dans la fonction)
- Exceptions avec JWT : `create-field`, `initiate-cagnotte-payment`, `link-contribution`

## Systeme de Paiement

### Commission (8% bruts)
- 3% paye par le joueur (prix x 1.03)
- 5% deduit du payout proprietaire (prix x 0.95)
- Frais CinetPay ~4% (3% Pay-In + 1% Transfer)
- Marge nette plateforme ~4%

### Flux
1. Joueur reserve → `create-cinetpay-payment` (ou `create-paydunya-invoice`)
2. Paiement confirme → reservation confirmee
3. Transfert proprietaire → `transfer-to-owner` (T x 0.95)
4. Monitoring → `check-cinetpay-transfers` (cron 15min) + webhooks

## Telephone - Normalisation

Tous les numeros sont normalises au format `+225XXXXXXXXXX` (Cote d'Ivoire).
- Prefixes mobiles valides : 01 (Moov), 05 (MTN), 07/08/09 (Orange)
- Utils dans `src/utils/phoneNormalization.ts`
- Pour CinetPay API : format 8 chiffres sans prefixe pays

## Roles Utilisateurs

- **Joueur** : recherche, reservation, paiement, avis, messagerie
- **Proprietaire** : gestion terrains, disponibilites, approbation reservations, suivi paiements
- **Admin** : validation proprietaires, gestion terrains, statistiques
- **Super Admin** : gestion utilisateurs, roles, audit logs

## Workflow Proprietaire (Onboarding)

1. Candidature (`/become-owner`) → verification OTP → `owner_applications` (pending)
2. Admin approuve → RPC `approve_owner_application` → creation dans `owners` + role `owner`
3. Integration CinetPay → `create-owner-contact` → `payment_accounts`

## Feature Cagnotte (Financement Collectif)

Permet a un groupe de joueurs de financer une reservation ensemble.
- Edge Functions : `initiate-cagnotte-payment`, `link-contribution`, `cleanup-cagnotte-cron`, `process-cagnotte-refunds`

## Tests

```bash
npm test           # Lancer tous les tests (80+)
npm run test:watch # Mode watch
```

Couverture : workflow proprietaire, paiements, Edge Functions, normalisation telephone, securite.

## Commandes Courantes

```bash
npm run dev        # Dev server (port 8080)
npm run build      # Build production
npm run lint       # ESLint
npm test           # Tests Jest
```

## Points d'Attention

- **Ne JAMAIS modifier** `src/integrations/supabase/types.ts` (auto-genere)
- **Toujours** utiliser les composants Shadcn/UI existants avant d'en creer de nouveaux
- **Toujours** normaliser les numeros de telephone avec `phoneNormalization.ts`
- **Verifier** les policies RLS apres toute modification de schema
- **Les fichiers `.old`** sont deprecies (Checkout.tsx.old, etc.) - ne pas les utiliser
- **Pays cible principal** : Cote d'Ivoire (CI), avec support Afrique de l'Ouest
- **Langue de l'interface** : Francais
- **Monnaie** : FCFA (XOF)
