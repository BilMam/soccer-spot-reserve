# Prompt Optimisé — Audit Stratégique & Technique de PISport

## Prompt prêt à envoyer à Claude Code :

---

Tu es un expert senior en développement fullstack, en architecture d'applications SaaS, et en stratégie produit. Tu as une vision business forte : tu sais prioriser ce qui a un **impact réel** sur les utilisateurs et le business, pas juste le code "propre pour être propre".

<contexte>
PISport est une plateforme de réservation de terrains de football en Côte d'Ivoire. Stack : React 18 + TypeScript + Tailwind/Shadcn, Supabase (PostgreSQL + Auth + Edge Functions + Storage), PayDunya pour les paiements mobile money.

L'app est en production avec de vrais utilisateurs. Elle comprend :
- 23 pages, ~190 composants, 37 hooks, 25 utils, 29 edge functions, 147 migrations
- Rôles : joueur, propriétaire de terrain, admin, super-admin
- Fonctionnalités : recherche de terrains, réservation avec calendrier, paiement en ligne (complet ou garantie/deposit), cagnotte (réservation groupée), messagerie, promotions, système de badges, avis/notes, notifications SMS/email, dashboard owner, admin et super-admin
</contexte>

<tâche>
Réalise un **audit complet et priorisé** de l'application. Pour chaque problème ou amélioration identifié, évalue son **impact business** (pas juste technique). L'audit doit couvrir ces 5 dimensions dans cet ordre de priorité :

### 1. 🔴 BUGS & PROBLÈMES CRITIQUES (impact immédiat sur les utilisateurs)
Cherche activement :
- Bugs fonctionnels qui empêchent les utilisateurs de compléter une action
- Problèmes de paiement (flux PayDunya, webhooks IPN, edge functions de paiement)
- Problèmes d'authentification ou de permissions
- Données incohérentes ou manquantes en base
- Race conditions dans les réservations (double-booking possible ?)
- Erreurs non gérées qui crashent l'app (manque de try/catch, loading states manquants)
- Problèmes de RLS (Row Level Security) — un utilisateur peut-il voir/modifier les données d'un autre ?

### 2. 🟠 SÉCURITÉ & FIABILITÉ (risques pour le business)
Cherche activement :
- `console.log` en production (il y en a 30+ — les lister et les supprimer)
- URLs hardcodées `.lovableproject.com` dans les edge functions (approve-booking, send-booking-email) — doivent utiliser `FRONTEND_BASE_URL`
- CORS `Access-Control-Allow-Origin: '*'` sur toutes les edge functions — restreindre au domaine de l'app
- Flag `SKIP_CINETPAY_VERIFY` dans cinetpay-webhook — vérifier qu'il est JAMAIS activé en prod
- Variables d'environnement non validées au démarrage de certaines edge functions
- Clé Supabase anon key dans le client — vérifier les politiques RLS associées
- Types `any` (60+ occurrences) qui réduisent la type-safety

### 3. 🟡 UX & PARCOURS UTILISATEUR (ce que les utilisateurs voient et ressentent)
Analyse les parcours critiques :
- **Parcours joueur** : recherche → détail terrain → sélection créneau → paiement → confirmation → mes réservations. Y a-t-il des frictions ? Des étapes confuses ? Des informations manquantes ?
- **Parcours propriétaire** : inscription → ajout terrain → gestion disponibilités → réception réservations → paiement reçu. Est-ce fluide ?
- **Parcours admin** : validation demandes owners, gestion terrains, géocodage. Fonctionnel ?
- **Mobile-first** : l'app est-elle vraiment optimisée mobile ? Composants qui débordent ? Textes trop petits ? Boutons trop proches ?
- **Performance perçue** : loading states partout ? Skeleton screens ? Feedback immédiat sur les actions ?
- **Messages d'erreur** : sont-ils en français et compréhensibles par un utilisateur non-technique ?

### 4. 🔵 AMÉLIORATIONS TECHNIQUES (dette technique qui ralentit le développement)
- Code dupliqué entre composants (ex: calculs de prix répétés, logique d'availability)
- Hooks trop longs ou qui font trop de choses
- Composants trop volumineux qui devraient être décomposés
- Logique métier dans les composants au lieu d'être dans les hooks/utils
- Requêtes Supabase non optimisées (N+1, requêtes sans index, pas de pagination)
- Tests manquants (il y a Jest configuré — qu'est-ce qui est testé ? Qu'est-ce qui devrait l'être en priorité ?)

### 5. 🟢 FONCTIONNALITÉS MANQUANTES & OPPORTUNITÉS (croissance business)
En tant qu'expert produit, identifie :
- Ce qui manque pour que les utilisateurs reviennent (rétention)
- Ce qui manque pour que les propriétaires recommandent la plateforme
- Ce qui pourrait différencier PISport de la concurrence en Afrique
- Les quick wins (effort faible, impact élevé) vs les projets majeurs
</tâche>

<format>
Pour CHAQUE item identifié, utilise ce format :

**[TITRE COURT DU PROBLÈME/AMÉLIORATION]**
- 📍 Fichier(s) : `chemin/vers/fichier.ts` (ligne X)
- 🎯 Impact : [Critique/Élevé/Moyen/Faible] — Explication en 1 phrase de l'impact business
- 🔧 Action : Description précise de ce qu'il faut faire
- ⏱️ Effort : [Rapide (< 30min) / Moyen (1-4h) / Important (1+ jour)]

À la fin, produis un **TABLEAU DE PRIORISATION** trié par ratio impact/effort :

| # | Action | Impact | Effort | Priorité |
|---|--------|--------|--------|----------|
| 1 | ...    | ...    | ...    | 🔴 P0   |
| 2 | ...    | ...    | ...    | 🟠 P1   |
| ...| ...   | ...    | ...    | ...      |

Où :
- 🔴 P0 = À faire MAINTENANT (bloque les users ou risque sécurité)
- 🟠 P1 = À faire cette semaine (améliore significativement l'expérience)
- 🟡 P2 = À faire ce mois (dette technique, optimisations)
- 🔵 P3 = Backlog (nice-to-have, futures fonctionnalités)
</format>

<contraintes>
- Ne propose PAS de refonte totale ou de changement de stack — l'app est en production
- Priorise toujours l'impact business sur la "pureté" technique
- Sois concret : donne les fichiers exacts, les lignes, le code à changer
- Si un problème n'affecte pas les utilisateurs et ne pose pas de risque, c'est P3 maximum
- Commence par scanner tous les fichiers avant de répondre — ne devine pas, vérifie
- Les edge functions PayDunya sont CRITIQUES — tout bug de paiement = perte de revenu
- L'app cible le marché ivoirien : mobile-first, mobile money, français
</contraintes>

Réfléchis étape par étape. Commence par scanner la codebase, puis analyse, puis priorise. Ne te précipite pas.
