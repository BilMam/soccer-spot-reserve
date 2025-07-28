# Create Owner Contact - CinetPay Transfer API

Edge Function pour créer automatiquement des contacts CinetPay Transfer pour les propriétaires de terrains MySport.

## Variables d'environnement requises

```bash
CINETPAY_TRANSFER_LOGIN=votre_login_transfer
CINETPAY_TRANSFER_PWD=votre_mot_de_passe_transfer
CINETPAY_API_BASE=https://client.cinetpay.com
SUPABASE_URL=votre_url_supabase
SUPABASE_SERVICE_ROLE_KEY=votre_service_role_key
```

## Route d'appel

```
POST /functions/v1/create-owner-contact
```

## Format de la requête

```json
{
  "owner_id": "uuid",
  "owner_name": "Prénom",
  "owner_surname": "Nom de famille",
  "phone": "0700071779",
  "email": "proprietaire@example.com",
  "country_prefix": "225"
}
```

## Format de réponse

### Succès
```json
{
  "success": true,
  "message": "Contact créé avec succès",
  "cinetpay_status": "OPERATION_SUCCES",
  "owner_id": "uuid"
}
```

### Contact déjà existant
```json
{
  "success": true,
  "message": "Contact déjà existant",
  "already_exists": true
}
```

### Erreur
```json
{
  "success": false,
  "message": "Message d'erreur détaillé"
}
```

## Fonctionnement

1. **Vérification** : Contrôle si le contact n'a pas déjà été créé
2. **Authentification** : Login auprès de l'API CinetPay Transfer
3. **Création contact** : Appel POST à `/v1/transfer/contact`
4. **Mise à jour DB** : Sauvegarde des informations dans `payment_accounts`
5. **Idempotence** : Les appels multiples ne créent pas de doublons

## Intégration automatique

Cette fonction est automatiquement appelée lors de l'approbation d'une demande de propriétaire via le hook `useOwnerApplications`.