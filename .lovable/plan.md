

## Corriger les erreurs de build + Ajouter le support multi-photos et video

### 1. Corriger l'erreur de build : import duplique

**Fichier** : `src/components/availability/SlotCreationForm.tsx`

La ligne 2 et la ligne 15 importent toutes les deux `format` depuis `date-fns`. Supprimer la ligne 15 (doublon).

### 2. Corriger le bug multi-upload (une seule photo sauvegardee)

**Fichier** : `src/components/ImageUpload.tsx` (et version `soccer-spot-reserve/`)

Le probleme est a la ligne 104 : dans la boucle `for`, `images` est capture par la closure au debut de la boucle. Quand on uploade 3 fichiers, chaque iteration fait `[...images, publicUrl]` avec le meme tableau `images` initial, donc seule la derniere image est conservee.

**Correction** : utiliser un `ref` pour tracker les images ajoutees pendant la boucle, ou accumuler les URLs et faire un seul appel a `onImagesChange` a la fin.

```text
Solution : accumuler les URLs uploadees puis appeler onImagesChange une seule fois
const uploadedUrls: string[] = [];
for (const file of files) {
  const url = await uploadFile(file);
  uploadedUrls.push(url);
}
onImagesChange([...images, ...uploadedUrls]);
```

### 3. Ajouter le support video

**Fichier** : `src/components/ImageUpload.tsx` (et version `soccer-spot-reserve/`)

- Ajouter `video/mp4,video/webm,video/quicktime` dans l'attribut `accept` de l'input file
- Afficher les fichiers video avec un element `<video>` au lieu de `<img>` (detection par extension ou type MIME)
- Renommer les labels "Images" en "Photos et videos" dans l'interface
- Augmenter la limite de taille pour les videos (max 50MB)
- Mettre a jour le texte d'aide : "Formats supportes: JPEG, PNG, WebP, MP4, WebM"

**Base de donnees** : Aucun changement necessaire. Le champ `images` (text array) stocke deja des URLs, il peut stocker des URLs de videos aussi.

**Storage** : Le bucket `field-images` accepte deja tous les types de fichiers. Aucun changement necessaire.

### 4. Corriger les erreurs edge functions (pre-existantes)

Ces erreurs dans les edge functions ne sont pas liees a nos changements mais doivent etre corrigees :

- `create-paydunya-payout/index.ts:136` : ajouter un cast via `unknown`
- `send-sms-notification/index.ts:66` : caster `error` en `Error`
- `simulate-paydunya-payment/index.ts:118` : caster `error` en `Error`
- `test-webhook-connectivity/index.ts:56` : caster `error` en `Error`
- `verify-owner-otp/index.ts:207` : caster `error` en `Error`

Pattern de correction : `(error as Error).message`

### Fichiers a modifier

1. `src/components/availability/SlotCreationForm.tsx` — supprimer import duplique
2. `soccer-spot-reserve/src/components/availability/SlotCreationForm.tsx` — idem si duplique
3. `src/components/ImageUpload.tsx` — fix multi-upload + support video
4. `soccer-spot-reserve/src/components/ImageUpload.tsx` — idem
5. `supabase/functions/create-paydunya-payout/index.ts` — fix type error
6. `supabase/functions/send-sms-notification/index.ts` — fix type error
7. `supabase/functions/simulate-paydunya-payment/index.ts` — fix type error
8. `supabase/functions/test-webhook-connectivity/index.ts` — fix type error
9. `supabase/functions/verify-owner-otp/index.ts` — fix type error

