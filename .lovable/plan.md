
## Problemes identifies

### Probleme 1 : Erreur de build PWA (BLOQUANT)
Le fichier JS genere fait 2.83 MB, ce qui depasse la limite par defaut de Workbox (2 MB). Le build echoue avec :
```
Assets exceeding the limit: assets/index-Dfao-wi_.js is 2.83 MB
```

**Correction** : Ajouter `maximumFileSizeToCacheInBytes` dans la config Workbox de `vite.config.ts` (par ex. 5 MB).

---

### Probleme 2 : Les heures sont limitees a 08:00 - 22:00 (CAUSE PRINCIPALE)

Trois endroits dans le code imposent cette limite :

**A) `src/utils/timeUtils.ts` - `generateTimeOptions()`** (ligne 16-18)
```typescript
for (let hour = 8; hour <= 22; hour++) {
  // ...
  if (hour < 22) { times.push(...:30) }
}
```
Genere uniquement de 08:00 a 22:00. Un terrain 24/7 a besoin de 00:00 a 23:30.

**B) `src/components/calendar/AvailableEndTimesCalculator.tsx`** (ligne 20)
```typescript
for (let minutes = startMinutes + 30; minutes <= timeToMinutes('22:00'); ...)
```
Les heures de fin sont plafonnees a 22:00. Meme si des creneaux existent apres 22h, ils ne seront jamais proposes comme heure de fin.

**C) Le `TimeSlotSelector` actuel (src)** utilise desormais `useAvailableTimesForDate` qui charge dynamiquement depuis la DB -- donc les heures de debut ne sont plus limitees par `generateTimeOptions`. MAIS les heures de fin sont toujours bloquees par `AvailableEndTimesCalculator`.

---

## Plan de correction

### Etape 1 : Corriger l'erreur de build PWA
**Fichier** : `vite.config.ts`

Ajouter dans la section `workbox` :
```typescript
maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5 MB
```

### Etape 2 : Etendre `generateTimeOptions` pour supporter 00:00 - 23:30
**Fichier** : `src/utils/timeUtils.ts`

Modifier la fonction pour couvrir les 24 heures :
```typescript
export const generateTimeOptions = (): string[] => {
  const times: string[] = [];
  for (let hour = 0; hour < 24; hour++) {
    times.push(`${hour.toString().padStart(2, '0')}:00`);
    times.push(`${hour.toString().padStart(2, '0')}:30`);
  }
  return times;
};
```

Cela genere 48 creneaux : 00:00, 00:30, 01:00, ..., 23:00, 23:30.

### Etape 3 : Corriger `AvailableEndTimesCalculator` pour supporter minuit (00:00)
**Fichier** : `src/components/calendar/AvailableEndTimesCalculator.tsx`

Remplacer la limite fixe `22:00` par `00:00` du jour suivant (= 24:00 en minutes = 1440) :
```typescript
for (let minutes = startMinutes + 30; minutes <= 1440; minutes += 30) {
```

Cela permet de selectionner 00:00 (minuit) comme heure de fin quand le dernier creneau est 23:30-00:00.

`minutesToTime(1440)` retourne `"24:00"` mais il faut gerer ce cas special pour l'afficher comme `"00:00"` ou `"00:00 (minuit)"`. Alternative plus simple : boucler jusqu'a `< 1440` et ajouter `"00:00"` comme derniere option si le creneau 23:30 est disponible.

### Etape 4 : Gerer l'affichage de minuit
**Fichier** : `src/utils/timeUtils.ts`

Ajouter une gestion du cas `minutes >= 1440` dans `minutesToTime` :
```typescript
export const minutesToTime = (minutes: number): string => {
  if (minutes >= 1440) return '00:00';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
};
```

Et adapter `calculateDuration` pour gerer le cas ou endTime < startTime (traversee de minuit).

---

## Details techniques

Les fichiers modifies seront :
1. `vite.config.ts` -- fix build PWA
2. `src/utils/timeUtils.ts` -- etendre plage horaire a 0-24h
3. `src/components/calendar/AvailableEndTimesCalculator.tsx` -- deplafonner les heures de fin

Aucune modification de base de donnees n'est necessaire : la table `field_availability` accepte deja n'importe quelle heure TIME. Le probleme est purement cote frontend.
