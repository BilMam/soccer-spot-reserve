

## Corriger le bouton "Retour" qui ne repond pas toujours

### Probleme

Le bouton "Retour" en haut a gauche de la page terrain (ligne 223-230 de `FieldDetail.tsx`) utilise `navigate(-1)` qui depend de l'historique du navigateur. Quand l'utilisateur arrive directement sur la page (lien partage, actualisation), il n'y a pas d'historique precedent et le clic ne produit aucun effet.

### Solution

**Fichier : `src/pages/FieldDetail.tsx` (lignes 223-230)**

1. Remplacer `navigate(-1)` par une logique avec fallback : si l'historique existe, revenir en arriere ; sinon, naviguer vers `/search`
2. Augmenter legèrement la zone de clic du bouton pour eviter les clics rates

```typescript
// Avant
<Button 
  variant="ghost" 
  onClick={() => navigate(-1)}
  className="mb-6 flex items-center space-x-2"
>

// Apres
<Button 
  variant="ghost" 
  onClick={() => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/search');
    }
  }}
  className="mb-6 flex items-center space-x-2 px-3 py-2"
>
```

### Detail technique

- `window.history.length > 1` verifie qu'il y a une page precedente dans l'historique
- Si non, on redirige vers `/search` comme destination logique par defaut
- Le padding supplementaire (`px-3 py-2`) agrandit la zone de clic du bouton ghost

### Fichier a modifier

- `src/pages/FieldDetail.tsx` uniquement (lignes 223-230)

