

## Synchroniser l'affichage des horaires sur la fiche terrain

### Probleme

Sur la page detail du terrain (ligne 245 de `FieldDetail.tsx`), les horaires affiches viennent du champ statique `field.availability_start` / `field.availability_end` (ex: "08:00:00 - 22:00:00"). Ces valeurs ne changent jamais, meme quand le proprietaire configure des jours en 24h/24 via les creneaux.

Le calendrier a droite, lui, affiche correctement "Ouvert 24h/24" car il lit les creneaux reels de la date selectionnee.

### Solution

Rendre l'affichage des horaires dynamique en fonction de la date selectionnee dans le calendrier. Si aucune date n'est selectionnee, afficher les horaires par defaut du terrain.

### Modifications

**1. `src/components/FieldCalendar.tsx`**
- Ajouter un callback optionnel `onHoursChange?: (start: string, end: string) => void`
- Quand les donnees d'availability changent, calculer la premiere et derniere heure du jour et appeler ce callback

**2. `src/pages/FieldDetail.tsx`**
- Ajouter un state `dynamicHours` (ex: `{ start: string, end: string }`)
- Passer un callback `onHoursChange` au composant `FieldCalendar`
- Modifier l'affichage (ligne 245) :
  - Si `dynamicHours.start === '00:00'` et `dynamicHours.end === '00:00'` : afficher "Ouvert 24h/24"
  - Sinon afficher `dynamicHours.start - dynamicHours.end`
  - Fallback sur `field.availability_start - field.availability_end` si pas de donnees

**3. `src/components/calendar/SlotBookingInterface.tsx`**
- Ajouter un prop `onHoursChange` et le declencher quand `availableSlots` change
- Calculer la premiere heure (`min(start_time)`) et la derniere heure (`max(end_time)`) des creneaux du jour

**4. `soccer-spot-reserve/src/pages/FieldDetail.tsx`**
- Memes modifications

### Detail technique

```text
Calcul des horaires du jour :
- firstHour = min(slot.start_time) de tous les creneaux du jour
- lastHour  = max(slot.end_time) de tous les creneaux du jour
- Si firstHour === '00:00' et lastHour === '00:00' -> "Ouvert 24h/24"
- Sinon -> "{firstHour} - {lastHour}"
```

### Fichiers a modifier

1. `src/components/FieldCalendar.tsx` -- ajouter callback onHoursChange
2. `src/components/calendar/SlotBookingInterface.tsx` -- calculer et remonter les horaires
3. `src/pages/FieldDetail.tsx` -- afficher les horaires dynamiques
4. `soccer-spot-reserve/src/pages/FieldDetail.tsx` -- memes modifications

