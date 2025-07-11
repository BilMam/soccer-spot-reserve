# MySport - Plateforme de réservation de terrains de sport

Une plateforme moderne pour réserver des terrains de sport avec un système de paiement sécurisé intégré.

## Fonctionnalités principales

- **Recherche et découverte** : Trouvez des terrains près de chez vous
- **Réservation en temps réel** : Système de créneaux avec disponibilité instantanée
- **Paiement sécurisé** : Intégration CinetPay avec système d'escrow
- **Gestion propriétaires** : Interface complète pour gérer vos terrains
- **Système d'avis** : Notation et commentaires après réservation

## Architecture de paiement

Le système de paiement MySport × CinetPay fonctionne selon le principe suivant :

1. **Paiement direct** : L'utilisateur clique sur "Payer" et est redirigé vers CinetPay
2. **Choix des moyens** : Tous les moyens de paiement (Orange Money, MTN, Moov, Wave, Visa/Mastercard) sont disponibles directement sur la page CinetPay
3. **Système d'escrow** : Les fonds sont sécurisés jusqu'à confirmation du propriétaire
4. **Remboursement automatique** : Si pas de confirmation sous 24h

> **Note** : Le choix du moyen de paiement est désormais entièrement délégué à l'interface CinetPay pour une expérience utilisateur optimisée.

## Installation locale

```bash
# Cloner le projet
git clone <YOUR_GIT_URL>
cd <YOUR_PROJECT_NAME>

# Installer les dépendances
npm install

# Lancer le serveur de développement
npm run dev
```

## Technologies utilisées

- **Frontend** : React, TypeScript, Tailwind CSS, Shadcn UI, Vite
- **Backend** : Supabase (PostgreSQL, Auth, Edge Functions, Storage)
- **Paiement** : CinetPay (Mobile Money, Carte bancaire)
- **Cartes** : Google Maps API
- **Déploiement** : Lovable

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/28d006fa-38ed-4ef6-8275-056ce757f09a) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)
