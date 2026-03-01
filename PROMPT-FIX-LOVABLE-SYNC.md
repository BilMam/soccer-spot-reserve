# Prompt pour Claude Code — Corriger la synchronisation Lovable.dev

## Contexte

Tu travailles sur le projet **PISport** (soccer-spot-reserve), une web app SaaS de réservation de terrains de sport en Afrique. Le stack est React + TypeScript + Vite + Supabase + Lovable.dev.

Le projet est connecté à Lovable.dev via GitHub (branche `main`). Lovable doit recevoir les modifications via `git push` pour les appliquer. **Actuellement, la synchronisation est cassée** — les modifications faites localement ne remontent pas dans Lovable.

Un diagnostic complet a été fait. Voici les **4 problèmes identifiés** et les **corrections exactes** à appliquer.

---

## Problème 1 — Fichier `index.lock` Git verrouillé

Un fichier `.git/index.lock` bloque toute opération Git (commit, push, pull). Il est resté en place après un crash.

### Correction

```bash
# Vérifier que le lock existe
ls -la .git/index.lock

# Le supprimer
rm -f .git/index.lock

# Vérifier que git fonctionne à nouveau
git status
```

---

## Problème 2 — Worktrees Claude Code cassés

Le dossier `.claude/worktrees/` contient deux worktrees (`interesting-torvalds` et `nifty-chebyshev`) qui pointent vers des chemins inexistants. Ces références cassées perturbent Git.

### Correction

```bash
# Lister les worktrees enregistrés par Git
git worktree list

# Supprimer les worktrees cassés proprement
git worktree remove .claude/worktrees/interesting-torvalds --force 2>/dev/null
git worktree remove .claude/worktrees/nifty-chebyshev --force 2>/dev/null

# Si la commande above échoue, nettoyage manuel
rm -rf .claude/worktrees/interesting-torvalds
rm -rf .claude/worktrees/nifty-chebyshev

# Puis nettoyer les références Git
git worktree prune

# Vérifier
git worktree list
# Doit afficher seulement le repo principal
```

---

## Problème 3 — Deux copies du code source (LE PLUS CRITIQUE)

Il existe un sous-dossier `soccer-spot-reserve/` à la racine du projet qui contient une ANCIENNE copie du code. Le résultat :

- **Racine** (`./src/`) → version RÉCENTE avec plus de fichiers (auth/, chat/, checkout/, owner/, promotions/, BookingWorkflowInfo.tsx, PaymentOnboarding.tsx, TimeFilterSelector.tsx, constants/, setupTests.ts)
- **Sous-dossier** (`./soccer-spot-reserve/src/`) → version ANCIENNE, il manque des fichiers et des migrations

### Différences constatées

**Fichiers présents dans `./src/` mais absents de `./soccer-spot-reserve/src/` :**
- `constants/` (dossier entier)
- `setupTests.ts`

**Composants présents dans `./src/components/` mais absents de `./soccer-spot-reserve/src/components/` :**
- `BookingWorkflowInfo.tsx`
- `BookingWorkflowStatus.tsx`
- `PaymentOnboarding.tsx`
- `TimeFilterSelector.tsx`
- `auth/` (dossier entier)
- `chat/` (dossier entier)
- `checkout/` (dossier entier)
- `owner/` (dossier entier)
- `promotions/` (dossier entier)

**Migrations : `./supabase/migrations/` a ~139 migrations de PLUS que `./soccer-spot-reserve/supabase/migrations/`**

### Correction

```bash
# 1. CONFIRMER que la racine est la version autoritaire
# (elle a plus de fichiers, plus de migrations, les dernières modifications)

# 2. Sauvegarder le sous-dossier au cas où
cp -r soccer-spot-reserve soccer-spot-reserve-BACKUP-$(date +%Y%m%d)

# 3. Vérifier s'il y a des fichiers dans le sous-dossier qui n'existent PAS dans la racine
diff <(cd soccer-spot-reserve/src && find . -type f | sort) <(cd src && find . -type f | sort) | grep "^<"
# Si rien de critique → supprimer le sous-dossier
# Si des fichiers uniques existent → les copier d'abord dans la racine

# 4. Supprimer le sous-dossier dupliqué
rm -rf soccer-spot-reserve/

# 5. Vérifier le .gitignore pour s'assurer que le sous-dossier ne sera pas recréé
cat .gitignore
```

**ATTENTION** : Avant de supprimer, vérifie bien qu'il n'y a aucun fichier unique dans le sous-dossier `soccer-spot-reserve/` qui n'existe pas dans la racine. Utilise la commande diff ci-dessus.

---

## Problème 4 — Pousser les changements vers GitHub/Lovable

Une fois les problèmes 1-3 corrigés, il faut synchroniser avec GitHub pour que Lovable voie les modifications.

### Correction

```bash
# 1. Vérifier l'état Git
git status

# 2. Ajouter tous les changements
git add -A

# 3. Commiter
git commit -m "fix: nettoyage structure projet - suppression dossier dupliqué et worktrees cassés"

# 4. Pousser vers GitHub (branche main)
git push origin main

# 5. Vérifier que le push a réussi
git log --oneline -3
```

Après le push, aller sur Lovable.dev et vérifier que la synchronisation s'est rétablie. Si Lovable montre des erreurs de build :

```bash
# Tester le build localement d'abord
npm run build

# Corriger les erreurs TypeScript s'il y en a
npx tsc --noEmit
```

---

## Ordre d'exécution

1. Supprimer `.git/index.lock` (Problème 1)
2. Nettoyer les worktrees cassés (Problème 2)
3. Vérifier et consolider les sources (Problème 3)
4. Push vers GitHub (Problème 4)
5. Vérifier sur Lovable.dev

---

## Vérification finale

Après toutes les corrections, ces commandes doivent toutes réussir :

```bash
git status                  # Pas d'erreur, working tree clean
git worktree list           # Un seul worktree (le repo principal)
ls soccer-spot-reserve/     # Erreur "No such file" (c'est normal, il a été supprimé)
npm run build               # Build réussi sans erreur
git push origin main        # Push réussi
```
