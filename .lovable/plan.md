

## Afficher "Ouvert 24h/24" au lieu de "Ouverture ce jour : 00:00"

### Probleme

Quand un terrain est configure en mode 24h/24, le composant `OccupiedSlotsDisplay` affiche :
> Ouverture ce jour : 00:00

Ce n'est pas clair. Il devrait afficher quelque chose comme :
> Ouvert 24h/24

### Correction

**Fichier : `src/components/calendar/OccupiedSlotsDisplay.tsx`** (lignes 47-51)

Modifier la condition d'affichage pour detecter le mode 24h (quand `firstAvailableTime` est `00:00`) et afficher un texte different :

- Si `firstAvailableTime === '00:00'` : afficher "Ouvert 24h/24"
- Si `firstAvailableTime` est une autre heure (et differente de `08:00`) : afficher "Ouverture ce jour : {heure}" comme avant
- Si `firstAvailableTime === '08:00'` ou `null` : ne rien afficher (comportement actuel)

```text
Avant :  "Ouverture ce jour : 00:00"
Apres :  "Ouvert 24h/24"
```

### Fichiers a modifier

1. `src/components/calendar/OccupiedSlotsDisplay.tsx` -- ajouter la condition pour le mode 24h
