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

**Calculs attendus** (modèle 3%/5%):
- Prix terrain: 10,000 XOF
- Commission utilisateur (3%): 300 XOF
- Frais CinetPay checkout (3%): 300 XOF
- **Total checkout**: 10,300 XOF (T × 1.03)
- Commission propriétaire (5%): 500 XOF

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

**Calculs attendus** (modèle 5% propriétaire):
- Montant brut: 10,000 × 0.95 = 9,500 XOF
- **Montant arrondi**: 9,500 XOF (déjà multiple de 5)
- Frais CinetPay Transfer (~1%): ~100 XOF

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

| Prix Terrain | Comm. User (3%) | Comm. Owner (5%) | Frais CinetPay (3%) | Total Checkout | Montant Owner (arrondi) | Commission Brute |
|--------------|-----------------|------------------|---------------------|----------------|------------------------|-------------------|
| 5,000 XOF    | 150 XOF        | 250 XOF          | 150 XOF             | 5,150 XOF      | 4,750 XOF → 4,750      | 400 XOF (8%)     |
| 10,000 XOF   | 300 XOF        | 500 XOF          | 300 XOF             | 10,300 XOF     | 9,500 XOF → 9,500      | 800 XOF (8%)     |
| 15,000 XOF   | 450 XOF        | 750 XOF          | 450 XOF             | 15,450 XOF     | 14,250 XOF → 14,250    | 1,200 XOF (8%)   |
| 7,777 XOF    | 233 XOF        | 389 XOF          | 233 XOF             | 8,010 XOF      | 7,388 XOF → 7,385      | 622 XOF (8%)     |

**Tests d'arrondi** (T × 0.95):
- [ ] 7,388 XOF → 7,385 XOF (multiple de 5 inférieur)
- [ ] 12,997 XOF → 12,995 XOF  
- [ ] 9,500 XOF → 9,500 XOF (déjà multiple)
- [ ] Commission brute = 8% dans tous les cas

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