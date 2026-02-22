
## Corriger le reverse geocoding qui echoue silencieusement

### Diagnostic

Le code actuel dans `FieldDetail.tsx` (lignes 86-95) appelle `reverseGeocode` apres `loadGoogleMaps`, mais :

1. La fonction `reverseGeocode` (dans `googleMapsUtils.ts` ligne 161-205) **avale toutes les erreurs** : elle fait un `catch` et retourne `null` silencieusement
2. Le `.then(addr => ...)` dans le `useEffect` ne catch pas les rejections internes de `reverseGeocode`
3. Cause probable : la cle API Google Maps n'a pas le service "Geocoding API" active, ou le quota est depasse. Le Geocoder cote JS retourne un statut d'erreur (ex: `REQUEST_DENIED`) qui est catch et ignore

### Solution robuste : double approche

Plutot que de dependre uniquement du SDK JavaScript Google Maps (qui necessite le chargement complet du script), ajouter un **fallback via l'API REST Geocoding** qui fonctionne avec un simple `fetch`. Cela resout aussi le probleme de timing du chargement du SDK.

### Modifications

**1. `src/utils/googleMapsUtils.ts`** -- Ajouter une fonction `reverseGeocodeREST`

Nouvelle fonction qui utilise directement l'API REST Google Maps Geocoding :
```typescript
export const reverseGeocodeREST = async (
  latitude: number, 
  longitude: number
): Promise<string | null> => {
  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&language=fr&key=${GOOGLE_MAPS_API_KEY}`
    );
    const data = await response.json();
    
    if (data.status === 'OK' && data.results?.length > 0) {
      return data.results[0].formatted_address;
    }
    
    console.warn('Reverse geocoding REST echoue:', data.status, data.error_message);
    return null;
  } catch (error) {
    console.error('Erreur reverse geocoding REST:', error);
    return null;
  }
};
```

**2. `src/pages/FieldDetail.tsx`** -- Utiliser la nouvelle approche REST

Modifier le `useEffect` (lignes 86-95) pour :
- Utiliser `reverseGeocodeREST` directement (pas besoin de charger le SDK Google Maps complet)
- Ajouter du logging pour diagnostiquer les echecs
- Garder un fallback propre

```typescript
useEffect(() => {
  if (!field?.latitude || !field?.longitude) return;
  let cancelled = false;
  
  const fetchAddress = async () => {
    try {
      const addr = await reverseGeocodeREST(field.latitude!, field.longitude!);
      if (!cancelled && addr) {
        setResolvedAddress(addr);
      }
    } catch (err) {
      console.error('Reverse geocoding echoue:', err);
    }
  };
  
  fetchAddress();
  return () => { cancelled = true; };
}, [field?.latitude, field?.longitude]);
```

**3. `src/components/forms/EditFieldForm.tsx`** -- Meme correction pour les formulaires

Remplacer l'appel a `reverseGeocode` par `reverseGeocodeREST` dans le `useEffect` existant pour l'affichage de l'adresse resolue.

**4. `src/components/FieldForm.tsx`** -- Idem

### Pourquoi cette approche

- L'API REST Geocoding fonctionne avec un simple `fetch`, pas besoin de charger le SDK JS complet
- Si la cle API n'a pas le Geocoding API active, l'API REST renverra un message d'erreur clair (`REQUEST_DENIED`) qu'on pourra logger
- Pas de probleme de timing avec le chargement du SDK
- Permet de diagnostiquer immediatement la cause de l'echec grace aux logs

### Fichiers a modifier

1. `src/utils/googleMapsUtils.ts` -- ajouter `reverseGeocodeREST`
2. `src/pages/FieldDetail.tsx` -- utiliser `reverseGeocodeREST` au lieu de `loadGoogleMaps + reverseGeocode`
3. `src/components/forms/EditFieldForm.tsx` -- meme modification
4. `src/components/FieldForm.tsx` -- meme modification
