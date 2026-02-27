# Prompt à donner à Claude Code dans VS Code

Copie-colle ce prompt dans Claude Code :

---

Tu es Claude Code, l'assistant IA intégré à mon environnement de développement. Tu vas configurer ton propre workspace optimal pour travailler efficacement sur ce projet à chaque session.

<contexte>
Ce projet est une plateforme de réservation de terrains de sport en Côte d'Ivoire et Afrique de l'Ouest, déployée en production. Le frontend est React/TypeScript/Vite, le backend est Supabase (PostgreSQL, Auth, Edge Functions, Storage). Les paiements passent par Paydunya (PAS CinetPay — CinetPay est abandonné, ignore toutes les références à CinetPay dans le code legacy).
</contexte>

<tâche>
Analyse en profondeur tout le codebase et crée un fichier CLAUDE.md à la racine du projet. Ce fichier sera lu automatiquement par toi à chaque nouvelle session, donc il doit contenir tout ce dont tu as besoin pour être immédiatement productif.

Procède étape par étape :

1. **Explore le codebase en entier** : structure des dossiers, fichiers clés, patterns utilisés, architecture, dépendances
2. **Analyse le code réel** (pas juste les noms de fichiers) : lis les fichiers importants pour comprendre les conventions, patterns de code, et l'architecture effective
3. **Identifie ce qui est actif vs legacy** : repère les fichiers .old, les imports CinetPay abandonnés, le code mort
4. **Crée le CLAUDE.md** avec tout le contexte nécessaire pour travailler efficacement

Le CLAUDE.md doit couvrir :
- Aperçu du projet et stack technique ACTUELLE (pas les vestiges legacy)
- Structure du code avec les fichiers/dossiers clés et leur rôle
- Conventions de code (imports, nommage, patterns, composants)
- Architecture des données (Supabase : tables principales, RLS, Edge Functions actives)
- Système de paiement ACTUEL (Paydunya uniquement)
- Flux métier critiques (réservation, onboarding propriétaire, paiements)
- Commandes utiles (dev, build, test, deploy)
- Pièges et points d'attention (fichiers à ne pas toucher, erreurs courantes)
- Checklist de vérification avant chaque modification (tests, RLS, types, etc.)
</tâche>

<contraintes>
- Le CLAUDE.md doit refléter l'état RÉEL et ACTUEL du code, pas ce qui est dans le README ou les anciens docs
- NE PAS mentionner CinetPay comme système actif — c'est du legacy abandonné
- Le système de paiement actif est Paydunya (Mobile Money : Orange Money, MTN Money, Moov Money)
- Sois concis mais complet : le fichier doit être une référence rapide, pas un roman
- Inclus les alias d'import (@/), les conventions Shadcn/UI, React Query, etc.
- Mentionne les fichiers auto-générés à ne pas modifier (types Supabase)
- Langue du CLAUDE.md : français
- Ajoute aussi une config .vscode/ si elle n'existe pas (settings.json, extensions.json)
</contraintes>

<format>
Markdown structuré avec des sections claires, des blocs de code pour les commandes et exemples, et des tableaux là où c'est pertinent. Le fichier doit pouvoir être scanné rapidement — utilise des titres H2/H3 et des listes à puces.
</format>

Commence par explorer le code, puis crée le CLAUDE.md. Montre-moi un résumé de ce que tu as trouvé avant de créer le fichier.
