

## Afficher l'adresse exacte via reverse geocoding sur la page terrain

### Probleme

Le terrain "MySport" a ses coordonnees GPS stockees dans les champs `address` ("5.336352") et `city` ("-3.948337") au lieu d'une vraie adresse. Le champ `location` contient "Cocody" (la commune), mais ce n'est pas assez precis.

Sur la page `FieldDetail.tsx`, l'affichage montre directement `field.address, field.city` = "5.336352, -3.948337" -- incomprehensible pour un joueur.

La solution : utiliser `reverseGeocode(field.latitude, field.longitude)` pour obtenir l'adresse exacte (ex: "Rue des Jardins, Cocody, Abidjan") et l'afficher a la place.

### Modifications

**Fichier : `src/pages/FieldDetail.tsx`**

1. Importer `reverseGeocode` et `loadGoogleMaps` depuis `@/utils/googleMapsUtils`
2. Ajouter un state `resolvedAddress` (initialement `null`)
3. Ajouter un `useEffect` qui :
   - Verifie que `field.latitude` et `field.longitude` existent
   - Charge Google Maps API via `loadGoogleMaps()`
   - Appelle `reverseGeocode(field.latitude, field.longitude)`
   - Stocke le resultat dans `resolvedAddress`
4. Modifier l'affichage (ligne 246) : utiliser `resolvedAddress` si disponible, sinon `field.location` comme fallback, sinon `field.address, field.city`

```typescript
// Import
import { reverseGeocode, loadGoogleMaps } from '@/utils/googleMapsUtils';

// State
const [resolvedAddress, setResolvedAddress] = useState<string | null>(null);

// useEffect
useEffect(() => {
  if (!field?.latitude || !field?.longitude) return;
  let cancelled = false;
  loadGoogleMaps().then(() => {
    reverseGeocode(field.latitude!, field.longitude!).then(addr => {
      if (!cancelled && addr) setResolvedAddress(addr);
    });
  });
  return () => { cancelled = true; };
}, [field?.latitude, field?.longitude]);

// Affichage (ligne 246)
{resolvedAddress || field.location || `${field.address}, ${field.city}`}
```

Le lien Google Maps restera base sur les coordonnees GPS (il fonctionne deja correctement -- le blocage vu en apercu est normal dans l'iframe Lovable, il marchera sur le site publie).

### Fichier a modifier

- `src/pages/FieldDetail.tsx` uniquement
