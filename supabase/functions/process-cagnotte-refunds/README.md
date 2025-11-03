# Process Cagnotte Refunds - Documentation

## Vue d'ensemble

Cette Edge Function traite automatiquement les remboursements des contributions de cagnotte lorsqu'une cagnotte est annulée ou expire.

## Fonctionnement

### 1. Déclenchement
La fonction est appelée automatiquement par le cron `cleanup-cagnotte-cron` toutes les 2 minutes, ou manuellement via un appel HTTP.

### 2. Processus de remboursement

1. **Récupération des contributions à rembourser**
   - Statut `refund_status` = 'PENDING' ou 'FAILED'
   - Moins de 5 tentatives (`refund_attempt_count` < 5)
   - Statut de contribution = 'SUCCEEDED'

2. **Idempotence**
   - Si une `refund_reference` existe déjà, la fonction vérifie le statut du remboursement existant
   - Évite les doubles remboursements

3. **Récupération du numéro de téléphone**
   - Appel à l'API PayDunya : `GET /checkout-invoice/confirm/{invoice_token}`
   - Extraction du numéro de téléphone du payeur

4. **Envoi du déboursement**
   - Appel à l'API PayDunya : `POST /disbursements`
   - Payload :
     ```json
     {
       "account_alias": "phone_number",
       "amount": 1000,
       "withdraw_mode": "mobile_money",
       "description": "Remboursement cagnotte - Raison: ..."
     }
     ```

5. **Mise à jour des statuts**
   - `refund_status` : PROCESSING → REFUNDED ou FAILED
   - `refund_reference` : sauvegarde de l'ID de transaction PayDunya
   - `refund_attempt_count` : incrémenté à chaque tentative
   - `refund_last_attempt_at` : timestamp de la dernière tentative
   - `refund_last_error` : message d'erreur en cas d'échec

6. **Confirmation finale**
   - Si toutes les contributions sont remboursées, la fonction `update_cagnotte_refund_status` est appelée
   - La cagnotte passe de 'REFUNDING' à 'REFUNDED'
   - `refund_completed_at` est renseigné

## Statuts de remboursement

| Statut | Description |
|--------|-------------|
| `PENDING` | En attente de traitement |
| `PROCESSING` | Remboursement en cours chez PayDunya |
| `REFUNDED` | Remboursement effectué avec succès |
| `FAILED` | Échec du remboursement (max 5 tentatives) |

## Webhooks IPN

Le webhook PayDunya (`paydunya-ipn`) traite les notifications de remboursement :
- Détection du type `transaction_type: 'disbursement'`
- Mise à jour du statut de la contribution selon la notification PayDunya
- Appel de `update_cagnotte_refund_status` si remboursement confirmé

## Variables d'environnement requises

```
PAYDUNYA_MASTER_KEY=<votre_master_key>
PAYDUNYA_PRIVATE_KEY=<votre_private_key>
PAYDUNYA_TOKEN=<votre_token>
PAYDUNYA_MODE=live  # 'test' ou 'live' (défaut: 'live')
SUPABASE_URL=<votre_url>
SUPABASE_SERVICE_ROLE_KEY=<votre_service_role_key>
```

**Note sur PAYDUNYA_MODE** :
- `test` : Mode sandbox pour les tests (aucun débit réel)
- `live` : Mode production (débits réels)
- Si non défini, la valeur par défaut est `live`

## API PayDunya utilisée

- **Récupération facture** : `GET https://app.paydunya.com/api/v1/checkout-invoice/confirm/{token}`
- **Déboursement** : `POST https://app.paydunya.com/api/v1/disbursements`
- **Statut déboursement** : `GET https://app.paydunya.com/api/v1/disbursements/{ref}`

## Gestion des erreurs

- **Tentatives multiples** : Jusqu'à 5 tentatives pour chaque contribution
- **Logging** : Tous les événements sont loggés dans la console
- **Statut FAILED** : Après 5 échecs, une intervention manuelle peut être nécessaire
- **Erreurs réseau** : Les erreurs temporaires sont automatiquement réessayées lors du prochain cron

## Tests

Pour tester manuellement :

```bash
# Appeler l'edge function directement
curl -X POST https://your-project.supabase.co/functions/v1/process-cagnotte-refunds \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

## Monitoring

Vérifier les logs dans le dashboard Supabase :
- **Edge Functions** > process-cagnotte-refunds > Logs
- **Database** > Logs (pour les fonctions SQL)

Requêtes utiles :

```sql
-- Contributions en attente de remboursement
SELECT * FROM cagnotte_contribution 
WHERE refund_status = 'PENDING' 
ORDER BY created_at DESC;

-- Cagnottes en cours de remboursement
SELECT * FROM cagnotte 
WHERE status = 'REFUNDING' 
ORDER BY updated_at DESC;

-- Contributions avec échecs multiples
SELECT * FROM cagnotte_contribution 
WHERE refund_status = 'FAILED' 
  AND refund_attempt_count >= 5
ORDER BY refund_last_attempt_at DESC;
```

## Dépannage

### Remboursement bloqué en PROCESSING
- Vérifier les logs PayDunya
- Attendre la notification webhook (peut prendre quelques minutes)
- Si nécessaire, vérifier le statut manuellement via l'API PayDunya

### Contributions non remboursées
- Vérifier que `refund_status` est bien 'PENDING'
- Vérifier le nombre de tentatives (`refund_attempt_count`)
- Consulter `refund_last_error` pour le message d'erreur
- Réinitialiser manuellement si nécessaire :
  ```sql
  UPDATE cagnotte_contribution 
  SET refund_status = 'PENDING', 
      refund_attempt_count = 0,
      refund_last_error = NULL
  WHERE id = '<contribution_id>';
  ```

### Cagnotte bloquée en REFUNDING
- Vérifier que toutes les contributions ont bien `refund_status = 'REFUNDED'`
- Appeler manuellement la fonction :
  ```sql
  SELECT update_cagnotte_refund_status('<cagnotte_id>');
  ```
