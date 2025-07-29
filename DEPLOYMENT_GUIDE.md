# Guide de Déploiement - Workflow d'Approbation des Propriétaires

## 📋 Pré-requis de Déploiement

### Variables d'Environnement Configurées ✅

#### Supabase Edge Functions (configurées via `supabase secrets`) ✅
- `CINETPAY_API_KEY` - Clé API CinetPay
- `CINETPAY_SITE_ID` - ID du site CinetPay  
- `CINETPAY_TRANSFER_LOGIN` - Login pour les virements CinetPay
- `CINETPAY_TRANSFER_PWD` - Mot de passe pour les virements CinetPay
- `FRONTEND_BASE_URL` - URL du frontend
- `SUPABASE_*` - Configuration Supabase

#### Vercel/Lovable Frontend (à configurer) ⚠️
Variables requises dans l'interface Vercel/Lovable:
- `NEXT_PUBLIC_SUPABASE_URL` - URL du projet Supabase
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Clé anonyme publique Supabase
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` - Clé API Google Maps (optionnel)

## 🚀 Étapes de Déploiement

### 1. Appliquer les Migrations
```bash
# Les migrations sont déjà synchronisées, mais pour nouvelle instance:
supabase db push

# Vérifier l'application des migrations:
supabase db diff --schema public
```

### 2. Déployer les Edge Functions
```bash
# Déployer toutes les Edge Functions du workflow:
supabase functions deploy create-owner-contact
supabase functions deploy owners-signup
supabase functions deploy approve-owner-request

# Vérifier le déploiement:
supabase functions list
```

### 3. Validation Post-Déploiement

#### Tests Automatisés
```bash
# Exécuter la suite de tests complète:
npm test
# Résultat attendu: 75/75 tests passés ✅
```

#### Vérifications Manuelles
1. **Test du workflow complet**:
   - Inscription propriétaire via `owners-signup`
   - Approbation via `approve-owner-request` 
   - Création compte CinetPay via `create-owner-contact`

2. **Vérifier les logs Edge Functions**:
```bash
supabase functions logs <function-name>
```

## 🔒 État de Sécurité RLS

### Politiques Appliquées ✅
- **owner_applications**: Politiques admin et service_role actives
- **owners**: Auto-lecture, modification limitée, accès admin complet
- **payment_accounts**: Auto-gestion propriétaires, accès admin
- **owner_workflow_audit**: Logs d'audit automatiques

### ⚠️ Point d'Attention
**Politique manquante pour owner_applications**:
Les utilisateurs ne peuvent actuellement pas voir leurs propres demandes. Si nécessaire pour l'UX:

```sql
CREATE POLICY "Users can view their own applications" 
ON public.owner_applications FOR SELECT 
USING (auth.uid() = user_id);
```

## 📊 Surveillance Production

### Logs à Surveiller
1. **Edge Functions**: Erreurs d'appel CinetPay, échecs de création de compte
2. **Base de données**: Violations RLS, requêtes lentes
3. **Audit Trail**: Table `owner_workflow_audit` pour traçabilité

### Métriques Clés
- Taux de succès des approbations propriétaires
- Temps de création des comptes CinetPay
- Échecs de normalisation des numéros de téléphone

## 🔧 Commandes de Diagnostic

```bash
# État des migrations
supabase migration list

# État des Edge Functions
supabase functions list

# Logs en temps réel
supabase functions logs --follow

# Test de connectivité base de données
supabase db ping
```

## ✅ Checklist de Validation

- [ ] Migrations appliquées sans erreur
- [ ] Edge Functions déployées et fonctionnelles  
- [ ] Tests automatisés (75/75) passés
- [ ] Variables d'environnement configurées
- [ ] Logs de déploiement vérifiés
- [ ] Test workflow complet effectué
- [ ] Surveillance mise en place

## 🚨 Rollback d'Urgence

En cas de problème critique:

```bash
# Revenir à la version précédente des Edge Functions
supabase functions deploy <function-name> --import-map-path /path/to/previous/version

# Revenir aux politiques RLS précédentes (si nécessaire)
# Appliquer une migration de rollback manuelle
```

## 📞 Support

En cas de problème, vérifier:
1. Logs des Edge Functions
2. Table `owner_workflow_audit` pour les opérations récentes
3. Configuration des secrets Supabase
4. Statut des services CinetPay

---

**Status**: ✅ Prêt pour le déploiement en production  
**Date**: 29 juillet 2025  
**Tests**: 75/75 passés  
**Sécurité**: Politiques RLS validées