#!/bin/bash
REPO="$HOME/MySport/soccer-spot-reserve"
LOG="$HOME/MySport/pisport-sync.log"
LOCKFILE="/tmp/pisport-autosync.lock"

# Eviter les instances multiples
if [ -f "$LOCKFILE" ]; then
    OLD_PID=$(cat "$LOCKFILE")
    if kill -0 "$OLD_PID" 2>/dev/null; then
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] Déjà en cours (PID $OLD_PID) — sortie" >> "$LOG"
        exit 0
    fi
fi
echo $$ > "$LOCKFILE"
trap 'rm -f $LOCKFILE' EXIT

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG"; }
log "PISport Auto-Sync v5 démarré (PID $$)"

do_push() {
    cd "$REPO" || return
    TOTAL=$(git status --porcelain | wc -l | tr -d ' ')
    [ "$TOTAL" -eq 0 ] && return
    log "$TOTAL fichier(s) — push en cours..."
    git add -A >> "$LOG" 2>&1
    git commit -m "auto-sync: $(date '+%d/%m %H:%M')" >> "$LOG" 2>&1
    git push origin main >> "$LOG" 2>&1 && log "OK GitHub sync" || log "ERREUR push"
}

export -f do_push
export REPO LOG

/opt/homebrew/bin/fswatch -o -r -l 10 -e "\.git" -e "node_modules" -e "dist" -e "auto-sync" -e "pisport-sync" "$REPO" | while IFS= read -r line; do
    log "Changement detecte ($line)"
    do_push
done
