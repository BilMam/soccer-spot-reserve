

## Corriger l'affichage tronque des creneaux et le decalage de dates

### Probleme 1 : Limite de 1000 lignes Supabase (PRINCIPAL)

Supabase retourne par defaut maximum 1000 lignes par requete. Avec 47 creneaux/jour en mode 24h sur 31 jours = 1457 creneaux, les ~10 derniers jours sont invisibles cote proprietaire.

### Probleme 2 : Decalage timezone avec toISOString()

`toISOString()` convertit en UTC, ce qui peut decaler la date d'un jour en arriere (ex: 19 fevrier 23h en UTC+1 devient 18 fevrier en UTC).

### Corrections

**1. `src/hooks/useFieldAvailability.ts` (ligne 18)**
- Ajouter `.limit(10000)` apres `.order('start_time', { ascending: true })`

**2. `src/hooks/useExistingSlots.ts` (ligne 17)**
- Ajouter `.limit(10000)` apres `.order('start_time')`

**3. `src/components/availability/SlotCreationForm.tsx` (lignes 111-112)**
- Remplacer `startDate.toISOString().split('T')[0]` par `format(startDate, 'yyyy-MM-dd')`
- Remplacer `endDate.toISOString().split('T')[0]` par `format(endDate, 'yyyy-MM-dd')`
- Ajouter `import { format } from 'date-fns'`

**4. Memes corrections dans le sous-repertoire `soccer-spot-reserve/`**
- `soccer-spot-reserve/src/hooks/useFieldAvailability.ts` : ajouter `.limit(10000)`
- `soccer-spot-reserve/src/hooks/useExistingSlots.ts` : ajouter `.limit(10000)`
- `soccer-spot-reserve/src/components/availability/SlotCreationForm.tsx` : remplacer `toISOString().split('T')[0]` par `format(date, 'yyyy-MM-dd')`

### Resultat
- Tous les creneaux seront affiches meme sur des periodes longues en mode 24h
- Les dates seront coherentes entre creation et affichage, sans decalage UTC

