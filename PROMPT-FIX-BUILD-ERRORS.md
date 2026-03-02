# Prompt pour Claude Code — Corriger les erreurs de build/checks GitHub

## Rôle

Tu es un développeur DevOps senior spécialisé Supabase + GitHub Actions. Tu dois corriger les 2 checks en échec sur le repo GitHub `BilMam/soccer-spot-reserve` pour que Lovable.dev puisse synchroniser correctement.

## Contexte

Le projet **PISport** (soccer-spot-reserve) est une web app SaaS déployée via **Vercel** (pas GitHub Pages) et connectée à **Lovable.dev** via GitHub.

Deux checks GitHub échouent sur chaque commit sur `main` :

1. **`build-and-deploy`** (GitHub Actions) → Erreur "git exit code 128" — c'est un vieux workflow qui déploie sur GitHub Pages, mais on utilise Vercel
2. **`Supabase Preview`** → "Remote migration versions not found in local migrations directory" — décalage entre les migrations sur le serveur Supabase et les fichiers locaux

**Chemin du projet** : `~/MySport/soccer-spot-reserve/`

## IMPORTANT — Ne touche PAS à Lovable

Le workflow `deploy.yml` (GitHub Pages) a DÉJÀ été désactivé dans le fichier. Il est maintenant en `workflow_dispatch` uniquement. Tu n'as PAS besoin de le modifier.

Lovable.dev n'est PAS affecté par ces changements — Lovable a son propre système de sync qui est indépendant de GitHub Actions et de GitHub Pages.

---

## ÉTAPE 1 — Vérifier que deploy.yml est bien désactivé

```bash
cd ~/MySport/soccer-spot-reserve/
cat .github/workflows/deploy.yml | head -15
```

Tu devrais voir `workflow_dispatch` au lieu de `push/pull_request`. Si c'est le cas, cette étape est déjà faite.

---

## ÉTAPE 2 — Corriger le problème de migrations Supabase

L'erreur "Remote migration versions not found in local migrations directory" signifie que la base Supabase distante a des migrations dont les timestamps ne correspondent pas aux fichiers locaux.

**Cause** : décalage de fuseau horaire (~12h) entre les timestamps des fichiers locaux et les versions enregistrées sur Supabase distant.

Par exemple :
- **Remote** : `20250614070002` (UTC)
- **Local** : `20250614190010-0884d31f-c02e-4fb6-8818-103fdb095379.sql` (UTC+12)

Les UUIDs correspondent, mais les timestamps non.

### Approche pour corriger

**Option A — Utiliser `supabase db pull`** (recommandé)

```bash
cd ~/MySport/soccer-spot-reserve/

# Installer le CLI Supabase si pas déjà fait
npx supabase --version 2>/dev/null || npm install -g supabase

# Lier le projet
npx supabase link --project-ref zldawmyoscicxoiqvfpu

# Tirer les migrations du serveur distant pour synchroniser l'état
npx supabase db pull
```

Cela va recréer les fichiers de migration locaux avec les bons timestamps qui correspondent au serveur distant.

**Option B — Réparer manuellement les timestamps** (si Option A échoue)

```bash
cd ~/MySport/soccer-spot-reserve/

# Lister les versions distantes
npx supabase migration list --project-ref zldawmyoscicxoiqvfpu

# Comparer avec les fichiers locaux
ls supabase/migrations/

# Renommer les fichiers locaux pour correspondre aux timestamps distants
# OU créer des fichiers placeholder pour les versions manquantes
```

**Option C — Réinitialiser l'historique de migrations** (dernier recours)

```bash
# Marquer toutes les migrations locales comme appliquées sur le remote
npx supabase db push --include-all
```

### Vérification

```bash
# Après correction, vérifier que les migrations sont synchronisées
npx supabase migration list --project-ref zldawmyoscicxoiqvfpu
```

Toutes les migrations doivent apparaître avec un statut "Applied" sans erreur.

---

## ÉTAPE 3 — Commit et Push

```bash
cd ~/MySport/soccer-spot-reserve/

git add -A
git status

# Vérifier que le build passe
npm run build

git commit -m "fix: désactiver GitHub Pages deploy + corriger migrations Supabase

- Workflow deploy.yml désactivé (on utilise Vercel)
- Migrations Supabase synchronisées avec le serveur distant"

git push origin main
```

---

## ÉTAPE 4 — Vérifier les checks GitHub

Après le push, va sur https://github.com/BilMam/soccer-spot-reserve/commits/main/ et vérifie que :

1. Le check `build-and-deploy` ne se déclenche plus (ou passe en vert)
2. Le check `Supabase Preview` passe en vert
3. Le check `Vercel` reste en vert

---

## Contraintes

- NE SUPPRIME PAS les fichiers de migration existants sans backup
- NE MODIFIE PAS le schéma de la base de données — on ne touche qu'aux fichiers de migration locaux
- NE TOUCHE PAS au workflow `claude.yml` ni au workflow `claude-code-review.yml`
- Le workflow `deploy.yml` est DÉJÀ désactivé — ne le modifie pas davantage
- NE FAIS RIEN qui pourrait affecter le déploiement Vercel ou la synchronisation Lovable
