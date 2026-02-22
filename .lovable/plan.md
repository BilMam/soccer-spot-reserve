

## Carrousel d'images sur la page terrain + Correction upload video

### Probleme 1 : Une seule image affichee

Dans `FieldDetail.tsx` (ligne 215-216), seule la premiere image est affichee :
```
src={field.images?.[0]}
```
Il n'y a aucun mecanisme pour naviguer entre les images.

**Solution** : Ajouter un carrousel avec des fleches gauche/droite et des indicateurs (points) en bas. Utiliser un state `currentIndex` pour naviguer. Afficher les videos avec un element `<video>` quand l'URL est une video.

Meme chose dans `FieldCard.tsx` : la carte dans le fil affiche `field.image` (une seule image). On n'ajoutera pas de carrousel sur les cartes (trop petit), mais la page detail aura le carrousel complet.

### Probleme 2 : Upload video echoue

Le bucket Supabase `field-images` a ete cree avec :
- `file_size_limit = 5242880` (5MB)
- `allowed_mime_types = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']`

Les videos (MP4, WebM) sont **rejetees** par le bucket car :
1. Les types MIME video ne sont pas dans `allowed_mime_types`
2. La limite de 5MB est trop petite pour les videos

**Solution** : Migration SQL pour mettre a jour le bucket :
- Augmenter `file_size_limit` a 52428800 (50MB)
- Ajouter `video/mp4`, `video/webm`, `video/quicktime` aux types autorises

### Modifications

**1. Nouvelle migration SQL**
```sql
UPDATE storage.buckets
SET
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY[
    'image/jpeg','image/jpg','image/png','image/webp',
    'video/mp4','video/webm','video/quicktime'
  ]
WHERE id = 'field-images';
```

**2. `src/pages/FieldDetail.tsx`**
- Ajouter un state `currentImageIndex`
- Remplacer l'image unique par un carrousel avec fleches gauche/droite
- Detecter les URLs video et afficher `<video>` avec controls
- Afficher des indicateurs (points) en bas de l'image
- Importer `ChevronLeft`, `ChevronRight` de lucide-react

**3. `soccer-spot-reserve/src/pages/FieldDetail.tsx`**
- Memes modifications

### Resultat
- Le proprietaire peut uploader des videos jusqu'a 50MB
- Les joueurs voient toutes les photos et videos du terrain avec des fleches de navigation
- Les videos sont jouables directement sur la page

