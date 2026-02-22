

## Corriger 3 problemes de geolocalisation

### Probleme 1 : Geocodage automatique qui se relance a chaque visite

Dans `EditFieldForm.tsx` (lignes 191-201), le `useEffect` de geocodage automatique se declenche a chaque fois que `formData.address` et `formData.city` changent -- y compris au chargement initial quand les donnees sont injectees depuis la base. Si le terrain a deja des coordonnees (`latitude`/`longitude`), il ne devrait pas re-geocoder.

**Correction** : Ajouter une condition pour ne pas geocoder si le terrain a deja des coordonnees valides.

```typescript
useEffect(() => {
  // Ne pas geocoder si les coordonnees existent deja
  if (!isApiReady || locationSource === 'geolocation' || formData.latitude !== null) return;
  // ... reste du code
}, [formData.address, formData.city, isApiReady, performGeocode, locationSource, formData.latitude]);
```

Meme correction dans `FieldForm.tsx` (creation de terrain) -- la, le geocodage automatique est normal au premier remplissage, mais il faut aussi eviter de re-geocoder si des coordonnees valides existent deja.

---

### Probleme 2 : Afficher une adresse lisible au lieu des coordonnees

Dans `EditFieldForm.tsx` (ligne 405), les coordonnees brutes sont affichees :
> Terrain localise : 5.349012, -3.982145

**Correction** : Utiliser `reverseGeocode` pour convertir les coordonnees en adresse lisible et l'afficher a la place. Ajouter un state `resolvedAddress` qui est rempli par reverse geocoding quand les coordonnees changent.

Fichiers concernes :
- `src/components/forms/EditFieldForm.tsx` : ajouter reverse geocoding apres localisation
- `src/components/FieldForm.tsx` : meme modification

---

### Probleme 3 : Lien cliquable vers Google Maps sur la fiche terrain

Dans `FieldDetail.tsx` (ligne 233-236), l'adresse est affichee en texte simple. Le joueur devrait pouvoir cliquer dessus pour ouvrir Google Maps.

**Correction** : Transformer l'adresse en lien cliquable. Si le terrain a des coordonnees GPS, utiliser `https://www.google.com/maps?q={lat},{lng}`. Sinon, utiliser `https://www.google.com/maps/search/{adresse}`.

```typescript
<a
  href={field.latitude && field.longitude
    ? `https://www.google.com/maps?q=${field.latitude},${field.longitude}`
    : `https://www.google.com/maps/search/${encodeURIComponent(`${field.address}, ${field.city}`)}`
  }
  target="_blank"
  rel="noopener noreferrer"
  className="text-blue-600 hover:underline"
>
  {field.address}, {field.city}
</a>
```

---

### Resume des fichiers a modifier

1. **`src/components/forms/EditFieldForm.tsx`** -- bloquer le geocodage auto si coordonnees existantes + afficher adresse lisible au lieu des coordonnees
2. **`src/components/FieldForm.tsx`** -- meme correction pour la creation
3. **`src/pages/FieldDetail.tsx`** -- rendre l'adresse cliquable vers Google Maps

