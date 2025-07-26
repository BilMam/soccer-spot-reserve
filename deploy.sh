#!/bin/bash

echo "🚀 Script de déploiement MySport"
echo "================================"

# Build l'application
echo "📦 Building application..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
fi

echo "✅ Build completed successfully!"

# Vérifier si Vercel CLI est installé
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Installing..."
    npm install -g vercel
fi

# Connexion et déploiement
echo "🔐 Connecting to Vercel..."
echo "Please follow the authentication steps..."

# Déployer
echo "🚀 Deploying to Vercel..."
vercel --prod --yes

echo "✅ Deployment completed!"
echo "🌐 Your app should be available at your Vercel URL"