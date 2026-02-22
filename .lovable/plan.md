

## Corriger l'adresse lisible et le lien cliquable

### Probleme 1 : Lien cliquable non applique au bon fichier

La modification pour rendre l'adresse cliquable a ete faite uniquement dans `soccer-spot-reserve/src/pages/FieldDetail.tsx` (le dossier duplique), mais pas dans le fichier principal `src/pages/FieldDetail.tsx` qui est celui utilise par l'application.

**Correction dans `src/pages/FieldDetail.tsx` :**
- Ajouter `latitude` et `longitude` a l'interface `Field` (lignes 23-49)
- Remplacer le `<span>` de l'adresse (ligne 235) par un lien `<a>` vers Google Maps

### Probleme 2 : Adresse lisible qui ne s'affiche pas (reverse geocoding)

Le code de reverse geocoding dans `EditFieldForm.tsx` et `FieldForm.tsx` est en place mais `reverseGeocode` echoue silencieusement si Google Maps API n'est pas encore charge quand les coordonnees sont deja presentes (cas de l'edition). Le `useEffect` se declenche une fois, `isApiReady` est `false`, puis quand `isApiReady` devient `true`, le `useEffect` ne se relance que si les coordonnees changent aussi.

En realite le `useEffect` a `isApiReady` dans ses dependances (ligne 220), donc il devrait se relancer. Le probleme est probablement que `reverseGeocode` verifie `window.google` mais l'API peut etre en cours de chargement. Il faut ajouter un log pour diagnostiquer, mais surtout s'assurer que le `useEffect` attend bien que `isApiReady` soit `true` avant d'appeler `reverseGeocode` -- ce qui est deja le cas (ligne 211).

Verification supplementaire : s'assurer que `initializeGoogleMaps()` est bien appele dans `EditFieldForm` pour que `isApiReady` passe a `true`.

### Modifications

**1. `src/pages/FieldDetail.tsx`**
- Ajouter `latitude: number | null;` et `longitude: number | null;` a l'interface `Field`
- Ligne 233-236 : remplacer le `<span>` par un `<a>` cliquable vers Google Maps :
  ```
  <a href={field.latitude && field.longitude
      ? `https://www.google.com/maps?q=${field.latitude},${field.longitude}`
      : `https://www.google.com/maps/search/${encodeURIComponent(field.address + ', ' + field.city)}`}
    target="_blank" rel="noopener noreferrer"
    className="text-blue-600 hover:underline">
    {field.address}, {field.city}
  </a>
  ```

**2. `src/components/forms/EditFieldForm.tsx`**
- Verifier que `initializeGoogleMaps()` est appele au montage (ajouter un `useEffect` si manquant)
- Le reverse geocoding (lignes 210-220) et l'affichage (ligne 424) sont deja en place -- il suffit de s'assurer que l'API est bien initialisee

**3. `src/components/FieldForm.tsx`**
- Meme verification que `initializeGoogleMaps()` est appele

### Fichiers a modifier

1. `src/pages/FieldDetail.tsx` -- ajouter latitude/longitude a l'interface + lien cliquable
2. `src/components/forms/EditFieldForm.tsx` -- verifier l'initialisation Google Maps
3. `src/components/FieldForm.tsx` -- verifier l'initialisation Google Maps

