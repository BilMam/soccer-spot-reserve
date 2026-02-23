# Deployer les Edge Functions modifiees

Les 3 Edge Functions suivantes ont ete modifiees pour supporter la feature
"Garantie Terrain Bloque" et doivent etre redeployees sur Supabase.

## Prerequis

- CLI Supabase installe (`npx supabase --version`)
- Projet lie (`npx supabase link`)

## Commandes

```bash
# Depuis ~/MySport/soccer-spot-reserve

# 1. S'assurer que le CLI Supabase est lie au projet
npx supabase link --project-ref zldawmyoscicxoiqvfpu

# 2. Deployer les 3 Edge Functions modifiees
npx supabase functions deploy create-paydunya-invoice --no-verify-jwt
npx supabase functions deploy paydunya-ipn --no-verify-jwt
npx supabase functions deploy create-paydunya-payout --no-verify-jwt
```

## Migrations DB

Les 2 migrations SQL doivent aussi etre appliquees :

```bash
npx supabase db push
```

Fichiers :
- `supabase/migrations/20260223180000_add_guarantee_fields.sql`
- `supabase/migrations/20260223180001_add_guarantee_bookings.sql`

## Changements par fonction

### create-paydunya-invoice
- Detection `payment_type === 'deposit'`
- Utilise `deposit_amount` et `deposit_public_price` pre-calcules
- Mise a jour minimale (status only) pour les bookings deposit
- Description PayDunya "Avance Garantie - ..."

### paydunya-ipn
- Detection `payment_type === 'deposit'`
- `payment_status` -> `'deposit_paid'` (pas `'paid'`) pour les depots
- `deposit_paid` -> `true`
- Payout declenche avec le bon montant

### create-paydunya-payout
- Accepte `payment_status IN ('paid', 'deposit_paid')`
- `payoutAmount` = `deposit_amount` pour les depots (pas `owner_amount`)
