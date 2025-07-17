# Plan de Tests - MySport CinetPay

## 🧪 Tests de Paiement

### 1. Test Checkout (create-cinetpay-payment)

**Objectif**: Vérifier la création correcte du checkout avec la nouvelle structure de frais

**Données de test**:
```json
{
  "field_id": "uuid-du-terrain",
  "slot": {
    "date": "2024-12-01",
    "start_time": "14:00",
    "end_time": "16:00"
  },
  "price": 10000
}
```

**Calculs attendus**:
- Prix terrain: 10,000 XOF
- Commission utilisateur (1,5%): 150 XOF
- Frais CinetPay estimés (2,5%): 250 XOF
- **Total checkout**: 10,400 XOF
- Commission propriétaire (3,5%): 350 XOF

**Vérifications**:
- [ ] Booking créé avec tous les champs de frais
- [ ] URL de paiement CinetPay retournée
- [ ] Transaction_id unique généré
- [ ] Logs au format ISO avec préfixe fonction

### 2. Test Transfert (transfer-to-owner)

**Prérequis**:
- Booking avec status='confirmed' et payment_status='completed'
- Contact propriétaire configuré dans CinetPay

**Données de test**:
```json
{
  "booking_id": "uuid-de-la-reservation"
}
```

**Calculs attendus**:
- Montant brut: 10,000 - 350 = 9,650 XOF
- **Montant arrondi**: 9,650 XOF (déjà multiple de 5)

**Vérifications**:
- [ ] Authentification CinetPay réussie
- [ ] Payout créé dans la table payouts
- [ ] Booking mis à jour avec cinetpay_transfer_id
- [ ] Transfer envoyé à l'API CinetPay

### 3. Test Webhook Transfert (cinetpay-transfer-webhook)

**Données de test**:
```json
{
  "treatment_status": "VAL",
  "client_transaction_id": "transfer_uuid_timestamp",
  "operator_transaction_id": "OP123456789",
  "amount": 9650,
  "currency": "XOF",
  "operator_name": "ORANGE_MONEY",
  "phone": "22507000000",
  "treatment_date": "2024-01-15 14:30:00"
}
```

**Vérifications**:
- [ ] Status 'VAL' → payout.status='paid'
- [ ] Status 'REJ' → payout.status='failed'
- [ ] Payout mis à jour correctement

### 4. Test Vérification Automatique (check-cinetpay-transfers)

**Scénario**: Fonction déclenchée par le schedule toutes les 15min

**Vérifications**:
- [ ] Récupération des payouts status='pending'
- [ ] Authentification CinetPay
- [ ] Appel API /check/money pour chaque payout
- [ ] Mise à jour des statuts selon les réponses
- [ ] Logs détaillés du processus

## 🔄 Tests d'Intégration

### 1. Flux Complet Utilisateur

**Étapes**:
1. Utilisateur sélectionne un terrain
2. Choix créneau et confirmation
3. Redirection vers CinetPay
4. Paiement réussi
5. Retour vers MySport
6. Confirmation booking

**Vérifications**:
- [ ] Calculs corrects à chaque étape
- [ ] Données cohérentes entre tables
- [ ] Notifications envoyées

### 2. Flux Complet Propriétaire

**Étapes**:
1. Réservation confirmée par propriétaire
2. Déclenchement automatique du transfert
3. Transfert en cours → pending
4. Webhook ou vérification automatique
5. Transfert finalisé → paid

**Vérifications**:
- [ ] Transfert déclenché automatiquement
- [ ] Montants corrects (arrondi multiple de 5)
- [ ] Suivi dans table payouts

## 🧮 Tests de Calculs

### Scénarios de Prix

| Prix Terrain | Comm. User (1,5%) | Comm. Owner (3,5%) | Frais CinetPay (2,5%) | Total Checkout | Montant Owner (arrondi) |
|--------------|-------------------|--------------------|-----------------------|----------------|------------------------|
| 5,000 XOF    | 75 XOF           | 175 XOF            | 125 XOF               | 5,200 XOF      | 4,825 XOF → 4,825      |
| 10,000 XOF   | 150 XOF          | 350 XOF            | 250 XOF               | 10,400 XOF     | 9,650 XOF → 9,650      |
| 15,000 XOF   | 225 XOF          | 525 XOF            | 375 XOF               | 15,600 XOF     | 14,475 XOF → 14,475    |
| 7,500 XOF    | 112 XOF          | 262 XOF            | 187 XOF               | 7,799 XOF      | 7,238 XOF → 7,235      |

**Tests d'arrondi**:
- [ ] 7,238 XOF → 7,235 XOF (multiple de 5 inférieur)
- [ ] 12,347 XOF → 12,345 XOF
- [ ] 9,650 XOF → 9,650 XOF (déjà multiple)

## 🔒 Tests de Sécurité

### 1. Authentification
- [ ] Appels sans token → 401
- [ ] Token invalide → 403
- [ ] Token expiré → 403

### 2. Validation Données
- [ ] Prix négatif → erreur
- [ ] Field_id inexistant → erreur
- [ ] Slot invalide → erreur

### 3. États Booking
- [ ] Transfer sur booking non confirmé → erreur
- [ ] Transfer déjà effectué → message approprié
- [ ] Booking inexistant → erreur

## 📊 Tests de Performance

### 1. Charge
- [ ] 100 checkout simultanés
- [ ] 50 transferts simultanés
- [ ] Vérification automatique avec 1000+ payouts

### 2. Latence
- [ ] Checkout < 5 secondes
- [ ] Transfert < 10 secondes
- [ ] Webhook < 2 secondes

## 🛠️ Tests de Monitoring

### 1. Logs
- [ ] Format ISO timestamp respecté
- [ ] Préfixe fonction présent
- [ ] Données sensibles masquées
- [ ] Erreurs détaillées

### 2. Alerts
- [ ] Échec authentification CinetPay
- [ ] Transferts en échec répétés
- [ ] Webhook rate limiting

## ✅ Checklist Déploiement

### Environnement
- [ ] Variables CinetPay configurées
- [ ] Schedule activé pour check-transfers
- [ ] Webhooks URL configurées dans CinetPay
- [ ] RLS policies testées

### Données
- [ ] Migration appliquée
- [ ] Tables payouts créées
- [ ] Index de performance créés
- [ ] Données de test nettoyées

### Monitoring
- [ ] Logs Edge Functions activés
- [ ] Alertes configurées
- [ ] Dashboard monitoring opérationnel

## 🎯 Critères de Validation

**Tests obligatoires avant production**:
1. ✅ Tous les tests de calculs passent
2. ✅ Flux complet utilisateur fonctionne
3. ✅ Flux complet propriétaire fonctionne
4. ✅ Webhooks traités correctement
5. ✅ Vérification automatique opérationnelle
6. ✅ Tests de sécurité passés
7. ✅ Performance acceptable sous charge

**Métriques de succès**:
- Taux de réussite checkout > 95%
- Temps de traitement transfert < 10s
- Taux de succès webhook > 99%
- Aucune perte de données financières