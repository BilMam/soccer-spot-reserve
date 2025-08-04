# Fonctions Edge à Supprimer - MySport

## ✅ SYSTÈME ACTUEL OPTIMISÉ

### Flux Principal de Réservation
1. **Réservation** → `create-cinetpay-payment` → Paiement CinetPay
2. **Webhook** → `cinetpay-webhook` → Confirmation booking
3. **Payout** → `create-owner-payout` → Transfert propriétaire

### Flux d'Approbation Propriétaire  
1. **Application** → Admin approuve → `approve-owner-request`
2. **Auto-création** → Contact CinetPay + Payout Account

## ❌ FONCTIONS OBSOLÈTES À SUPPRIMER

### 1. Fonctions Dupliquées/Remplacées
- `transfer-to-owner/` → **Remplacée par** `create-owner-payout`
- `owners-signup/` → **Remplacée par** `approve-owner-request`
- `verify-owner-otp/` → **Non utilisée** (OTP désactivé)
- `request-owner-otp/` → **Non utilisée** (OTP désactivé)

### 2. Fonctions de Migration (Obsolètes)
- `migrate-legacy-owners/` → **Migration terminée**
- `apply-migration/` → **Migration terminée** 
- `force-migration/` → **Migration terminée**

## 🔧 ACTIONS À EFFECTUER

### Supprimer les dossiers Edge Functions
```bash
rm -rf supabase/functions/transfer-to-owner/
rm -rf supabase/functions/owners-signup/
rm -rf supabase/functions/verify-owner-otp/
rm -rf supabase/functions/request-owner-otp/
rm -rf supabase/functions/migrate-legacy-owners/
rm -rf supabase/functions/apply-migration/
rm -rf supabase/functions/force-migration/
```

### Vérifier les références dans le code
- ✅ `useOwnerTransfer.ts` → Corrigé pour utiliser `create-owner-payout`
- ✅ `useOwnerApplications.ts` → Utilise `approve-owner-request`
- ✅ `config.toml` → Nettoyé des fonctions obsolètes

## 🧪 TESTS À EFFECTUER

### Test Complet du Flux
1. **Créer une demande propriétaire** → Application pending
2. **Approuver via admin** → Contact CinetPay créé automatiquement  
3. **Effectuer une réservation** → Paiement CinetPay
4. **Confirmer la réservation** → Payout automatique au propriétaire

### Vérifications Post-Suppression
- ✅ Aucune référence à `transfer-to-owner` dans le code
- ✅ Flux de paiement fonctionne avec `create-owner-payout`
- ✅ Approbation propriétaire fonctionne avec `approve-owner-request`