

## Ajouter un bouton "24/7" dans la configuration des creneaux

### Ce qui sera fait
Ajouter un bouton/toggle "Terrain 24/7" dans le formulaire `BasicConfigurationForm` (la section "Horaires de disponibilite") qui, lorsqu'il est active :
- Met automatiquement l'heure d'ouverture a **00:00**
- Met automatiquement l'heure de fermeture a **23:30** (dernier creneau possible)
- Desactive visuellement les champs heure pour montrer que c'est en mode 24h

### Fichier modifie

**`src/components/availability/BasicConfigurationForm.tsx`**

Ajout d'un bouton toggle au-dessus des champs horaires :

```
[Horaires de disponibilite]
[ Toggle: Terrain ouvert 24h/24 ]    <-- NOUVEAU

Heure d'ouverture: [00:00]  (grise si 24/7)
Heure de fermeture: [23:30]  (grise si 24/7)
Duree des creneaux: [30 min]
```

Details techniques :
- Un state local `is24h` derive de `startTime === '00:00' && endTime === '23:30'`
- Au clic sur le toggle : appelle `onStartTimeChange('00:00')` et `onEndTimeChange('23:30')`
- Au declic : remet les valeurs par defaut `08:00` / `22:00`
- Les inputs `type="time"` deviennent `disabled` quand le mode 24/7 est actif
- Utilisation du composant `Switch` de shadcn/ui existant avec un label et une icone horloge

Le meme changement sera applique dans `soccer-spot-reserve/src/components/availability/BasicConfigurationForm.tsx`.

