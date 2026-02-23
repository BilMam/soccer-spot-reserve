#!/bin/bash
# PISport Git Sync — synchronise automatiquement avec GitHub
# Usage: ./sync.sh [push "message"] | pull | status

REPO_DIR="$HOME/MySport/soccer-spot-reserve"
cd "$REPO_DIR"

case "$1" in
  push)
    MSG="${2:-sync: mise à jour automatique}"
    echo "? Push vers GitHub..."
    git add -A
    git commit -m "$MSG" 2>/dev/null || echo "Rien à committer"
    git push origin main
    echo "? Synchronisé sur GitHub"
    ;;
  pull)
    echo "? Pull depuis GitHub..."
    git pull origin main
    echo "? Dossier local mis à jour"
    ;;
  status)
    echo "? Statut Git :"
    git status
    echo ""
    echo "? Derniers commits :"
    git log --oneline -5
    ;;
  *)
    echo "Usage: ./sync.sh [push 'message'] | pull | status"
    echo ""
    echo "Exemples:"
    echo "  ./sync.sh pull              — Récupère les derniers changements GitHub"
    echo "  ./sync.sh push              — Envoie tes changements sur GitHub"
    echo "  ./sync.sh push 'ma modif'   — Push avec un message personnalisé"
    echo "  ./sync.sh status            — Voir l'état du repo"
    ;;
esac