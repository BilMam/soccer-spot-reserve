---
description: Installe un skill ou applique une action recommandée par la veille YouTube.
---

Lis le fichier `~/ai-veille-dashboard/data/pending_actions.json` et présente les actions en attente (status = "pending").

Pour chaque action :
- Affiche le titre, la description, le type, et le créateur de la vidéo source
- Si du code est inclus, affiche-le
- Si un lien GitHub est fourni, propose de le visiter

Demande à l'utilisateur quelle action appliquer. Quand il confirme :

1. Si type = "skill" : crée le fichier dans `~/.claude/commands/` avec le contenu approprié
2. Si type = "config" : applique la configuration dans le fichier concerné
3. Si type = "tool" : installe l'outil (npm/pip/brew selon le cas)
4. Si type = "workflow" : crée les fichiers nécessaires et explique comment l'utiliser

Après application, mets à jour le status de l'action à "applied" dans `pending_actions.json`.

$ARGUMENTS
