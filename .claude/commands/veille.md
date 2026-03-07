---
description: Scan les chaînes YouTube (Nate Herk, Liam Ottley, Jack Roberts) pour détecter de nouvelles vidéos, extraire les transcriptions et analyser le contenu avec Claude.
---

Lance un scan de veille YouTube pour les chaînes suivantes :
- Nate Herk (@nateherk)
- Liam Ottley (@LiamOttley)
- Jack Roberts (@Itssssss_Jack)

Étapes :
1. Exécute `cd ~/ai-veille-dashboard/monitor && python3 main.py`
2. Lis le fichier `~/ai-veille-dashboard/data/videos.json` pour voir les résultats
3. Lis le fichier `~/ai-veille-dashboard/data/pending_actions.json` pour les actions en attente
4. Présente un résumé clair :
   - Nombre de nouvelles vidéos trouvées
   - Pour chaque vidéo : titre, créateur, catégorie, importance
   - Actions actionnables avec description
   - Recommandations sur les actions à appliquer en priorité (importance "high")
