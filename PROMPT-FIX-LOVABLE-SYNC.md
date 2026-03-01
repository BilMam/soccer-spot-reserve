# Prompt pour Claude Code — Corriger la synchronisation Lovable.dev

## Rôle

Tu es un développeur DevOps senior. Tu dois corriger la synchronisation Git/Lovable.dev du projet PISport. Suis les étapes ci-dessous **dans l'ordre exact**, sans sauter d'étape. Après chaque étape, vérifie que la correction a fonctionné avant de passer à la suivante.

## Contexte

Le projet **PISport** (soccer-spot-reserve) est une web app SaaS (React + TypeScript + Vite + Supabase) connectée à Lovable.dev via GitHub (branche `main`).

**Problème** : la synchronisation est cassée — les modifications locales ne remontent pas dans Lovable.

**Chemin du projet** : `~/MySport/soccer-spot-reserve/`

Un diagnostic complet a identifié **4 problèmes**. Voici les corrections exactes.

---

## ÉTAPE 1 — Supprimer le verrou Git (`index.lock`)

Un fichier `.git/index.lock` bloque toutes les opérations Git. Il est resté après un crash.

```bash
cd ~/MySport/soccer-spot-reserve/

# Vérifier
ls -la .git/index.lock

# Supprimer le verrou
rm -f .git/index.lock

# Vérifier que Git remarche
git status
```

**Résultat attendu** : `git status` affiche l'état du repo sans erreur.

---

## ÉTAPE 2 — Nettoyer les worktrees Claude Code cassés

Le dossier `.claude/worktrees/` contient deux worktrees cassés (`interesting-torvalds` et `nifty-chebyshev`) qui pointent vers des chemins inexistants et perturbent Git.

```bash
# Lister les worktrees
git worktree list

# Supprimer proprement
git worktree remove .claude/worktrees/interesting-torvalds --force 2>/dev/null
git worktree remove .claude/worktrees/nifty-chebyshev --force 2>/dev/null

# Si les commandes ci-dessus échouent, nettoyage manuel
rm -rf .claude/worktrees/interesting-torvalds
rm -rf .claude/worktrees/nifty-chebyshev

# Nettoyer les références Git
git worktree prune

# Vérifier
git worktree list
```

**Résultat attendu** : `git worktree list` affiche UNE SEULE ligne (le repo principal).

---

## ÉTAPE 3 — Sauvegarder et supprimer le dossier dupliqué (LE PLUS CRITIQUE)

Il existe un sous-dossier `soccer-spot-reserve/` DANS le projet qui contient une ANCIENNE copie du code. C'est la cause principale du problème de sync.

**La racine (`./src/`) est la version RÉCENTE et autoritaire** — elle a plus de fichiers et plus de migrations.

### 3a — Créer la sauvegarde dans un chemin SÉPARÉ

**IMPORTANT** : La sauvegarde va dans `~/MySport/BACKUP-PISport/`, PAS dans le dossier du projet.

```bash
# Créer le dossier de sauvegarde en dehors du projet
mkdir -p ~/MySport/BACKUP-PISport/

# Copier le sous-dossier dupliqué comme backup avec la date
cp -r ~/MySport/soccer-spot-reserve/soccer-spot-reserve ~/MySport/BACKUP-PISport/soccer-spot-reserve-BACKUP-$(date +%Y%m%d)

# Vérifier que le backup est bien là
ls -la ~/MySport/BACKUP-PISport/
```

### 3b — Vérifier qu'on ne perd rien

Avant de supprimer, vérifie s'il y a des fichiers dans le sous-dossier qui n'existent PAS dans la racine :

```bash
cd ~/MySport/soccer-spot-reserve/

# Comparer les fichiers source
diff <(cd soccer-spot-reserve/src && find . -type f | sort) <(cd src && find . -type f | sort) | grep "^<"

# Comparer les migrations
diff <(ls soccer-spot-reserve/supabase/migrations/ | sort) <(ls supabase/migrations/ | sort) | grep "^<"
```

- Si `grep "^<"` ne retourne RIEN → tout est déjà dans la racine, on peut supprimer.
- Si des fichiers uniques existent dans le sous-dossier → copie-les d'abord dans la racine AVANT de supprimer.

### 3c — Supprimer le sous-dossier dupliqué

```bash
# Supprimer le dossier dupliqué
rm -rf ~/MySport/soccer-spot-reserve/soccer-spot-reserve/

# Vérifier qu'il n'existe plus
ls ~/MySport/soccer-spot-reserve/soccer-spot-reserve/ 2>&1
# Doit afficher: "No such file or directory"
```

### 3d — Empêcher que ça se reproduise

```bash
# Ajouter au .gitignore pour éviter toute recréation accidentelle
echo "" >> .gitignore
echo "# Empêcher la recréation du sous-dossier dupliqué" >> .gitignore
echo "soccer-spot-reserve/" >> .gitignore
```

---

## ÉTAPE 4 — Nettoyer les fichiers inutiles à la racine

Il y a des fichiers de debug/test/prompts à la racine qui polluent le repo. Supprime-les :

```bash
cd ~/MySport/soccer-spot-reserve/

# Fichiers de debug/test à supprimer
rm -f debug-signup.js
rm -f test-local-flow.js
rm -f test-owner-approval-guard.js
rm -f test-owner-payout-flow.js
rm -f test-payout-debug.js
rm -f test-simple-signup.js
rm -f test-autosync.md
rm -f apply_migration.js
rm -f fix-remote-schema.sql
rm -f migration_manual.sql
rm -f migration_sql.sql
rm -f admin_migration.sql
rm -f mark_manual_refunds.sql
rm -f preview-garantie-redesign.jsx
rm -f preview-wizard-terrain.jsx

# Fichiers prompts (les garder seulement si tu en as besoin)
# rm -f prompt-*.md
```

---

## ÉTAPE 5 — Build test + Push vers GitHub/Lovable

```bash
cd ~/MySport/soccer-spot-reserve/

# 1. Vérifier le build
npm run build

# 2. Si le build réussit, commit et push
git add -A
git status
# Vérifie visuellement que les fichiers modifiés/supprimés sont corrects

git commit -m "fix: nettoyage projet — suppression dossier dupliqué, worktrees cassés, fichiers de debug

- Supprimé le sous-dossier soccer-spot-reserve/ (ancienne copie du code)
- Supprimé .git/index.lock (verrou Git bloquant)
- Nettoyé les worktrees Claude Code cassés
- Supprimé les fichiers de test/debug à la racine
- Backup créé dans ~/MySport/BACKUP-PISport/"

git push origin main

# 3. Vérifier
git log --oneline -3
```

**Si le build échoue** : corrige les erreurs TypeScript avant de push.

```bash
npx tsc --noEmit 2>&1 | head -50
```

---

## VÉRIFICATION FINALE

Toutes ces commandes doivent réussir :

```bash
git status                                    # "working tree clean"
git worktree list                             # Une seule ligne
ls ~/MySport/soccer-spot-reserve/soccer-spot-reserve/ 2>&1   # "No such file"
ls ~/MySport/BACKUP-PISport/                  # Le backup est là
npm run build                                 # Build OK
```

Ensuite, va sur Lovable.dev et vérifie que la synchronisation fonctionne.

---

## Structure finale attendue

```
~/MySport/
├── soccer-spot-reserve/        ← LE SEUL projet (racine autoritaire)
│   ├── src/                    ← Code source unique
│   ├── supabase/               ← Migrations + Edge Functions
│   ├── public/
│   ├── package.json
│   ├── vite.config.ts
│   └── ...
│
└── BACKUP-PISport/             ← Backups séparés, hors du repo Git
    └── soccer-spot-reserve-BACKUP-20260301/
```

## Contraintes

- NE MODIFIE PAS le contenu des fichiers source (src/) — seulement la structure du projet
- NE SUPPRIME PAS le dossier `soccer-spot-reserve/` sans avoir vérifié qu'aucun fichier unique n'y existe (étape 3b)
- NE PUSH PAS vers GitHub si le build échoue
- Le backup doit être dans `~/MySport/BACKUP-PISport/`, PAS dans le dossier du projet
