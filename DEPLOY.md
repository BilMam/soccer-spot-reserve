# Guide de déploiement MySport

## 🚀 Déploiement rapide sur Vercel

### Option 1: Interface Vercel (Recommandée)

1. **Aller sur [vercel.com](https://vercel.com)**
2. **Se connecter avec GitHub**
3. **Importer le projet**: `BilMam/soccer-spot-reserve`
4. **Configurer les variables d'environnement**:
   ```
   VITE_SUPABASE_URL=https://zldawmyoscicxoiqvfpu.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsZGF3bXlvc2NpY3hvaXF2ZnB1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk5MjY5NDAsImV4cCI6MjA2NTUwMjk0MH0.kKLUE9qwd4eCiegvGYvM3TKTPp8PuyycGp5L3wsUJu4
   ```
5. **Déployer** → Vercel détecte automatiquement Vite et configure le build

### Option 2: CLI Vercel

```bash
# Installation (si nécessaire)
npm install -g vercel

# Connexion à Vercel
vercel login

# Déploiement en production
vercel --prod
```

### Option 3: Script automatique

```bash
# Utiliser le script fourni
chmod +x deploy.sh
./deploy.sh
```

## ✅ Vérifications post-déploiement

1. **Page d'accueil** accessible
2. **Authentification** fonctionne
3. **Formulaire "Devenir propriétaire"** → État "Demande en cours" (jaune)
4. **Pas d'erreur "Impossible de contacter le serveur"**

## 🔧 Configuration actuelle

- **Build**: `npm run build` (Vite)
- **Output**: `dist/`
- **Node version**: Auto-détectée
- **Framework preset**: Vite

## 📱 URLs de test

- **Production**: `https://[votre-url].vercel.app`
- **Page test**: `/become-owner` (inscription propriétaire)

## 🐛 Dépannage

Si erreur au déploiement:
1. Vérifier les variables d'environnement
2. Vérifier que la branche `main` est à jour
3. Consulter les logs Vercel