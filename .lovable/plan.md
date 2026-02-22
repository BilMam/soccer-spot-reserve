

## Corriger l'affichage "Ouvert 24h/24" sur la fiche terrain

### Probleme

Pour un terrain ouvert 24h/24, les creneaux vont de `00:00` a `00:00` (minuit a minuit). Le dernier creneau est `23:30-00:00`.

Dans `FieldCalendar.tsx`, le calcul de `lastHour` utilise une comparaison de chaines :
```
const lastHour = times.reduce((max, t) => t.end > max ? t.end : max, ...)
```

Le probleme : `"00:00" > "23:30"` est **faux** en comparaison de chaines, donc `lastHour` reste a `"23:30"` au lieu de `"00:00"`.

Resultat : la page affiche "00:00 - 23:30" au lieu de "Ouvert 24h/24".

### Solution

Modifier le calcul dans `FieldCalendar.tsx` (lignes 36-44) pour traiter `00:00` comme cas special pour `end_time` :
- Si un des creneaux a un `end_time` de `"00:00"` (minuit = fin de journee), alors `lastHour` doit etre `"00:00"`
- La condition dans `FieldDetail.tsx` (`start === '00:00' && end === '00:00'`) fonctionnera alors correctement et affichera "Ouvert 24h/24"

### Fichier a modifier

**`src/components/FieldCalendar.tsx`** (useEffect lignes 33-45)

Ajouter une detection : si un creneau a `end === '00:00'`, c'est minuit (fin de journee), donc on force `lastHour = '00:00'` directement.

```typescript
const hasEndMidnight = times.some(t => t.end === '00:00');

if (hasEndMidnight && firstHour === '00:00') {
  onHoursChange('00:00', '00:00'); // 24h/24
} else {
  onHoursChange(firstHour, lastHour);
}
```

Aucune autre modification necessaire car la condition dans `FieldDetail.tsx` et `OccupiedSlotsDisplay.tsx` gere deja le cas `00:00 / 00:00` = "Ouvert 24h/24".

