

## Probleme

L'erreur de build est dans `supabase/functions/create-paydunya-payout/index.ts` ligne 139. Le cast TypeScript echoue car le type infere par Supabase ne correspond pas au type cible. Le message dit : "convert the expression to 'unknown' first".

## Correction

Dans `supabase/functions/create-paydunya-payout/index.ts`, ajouter `as unknown` avant le cast final a la ligne 139 :

```typescript
const fieldsData = bookingData.fields as unknown as { 
  id: string; name: string; payout_account_id: string; 
  payout_accounts: { id: string; phone: string; is_active: boolean; owner_id: string }[] | { id: string; phone: string; is_active: boolean; owner_id: string } | null 
};
```

C'est un changement d'une seule ligne. Le reste du code (extraction de `payoutAccountRaw` et `payoutAccount`) est deja correct.

