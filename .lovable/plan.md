

## Corriger la visibilite des onglets aux extremites

### Probleme
Les degradees (indicateurs de scroll) de 40px couvrent les premiers et derniers onglets, rendant leur texte partiellement cache. Meme en scrollant au maximum, on ne voit pas entierement "Mes terrains" a gauche ni "Periode" a droite.

### Solution
Deux ajustements simples :

**1. Reduire la largeur des degradees**
- Passer de `w-10` (40px) a `w-6` (24px) pour les deux degradees
- Cela suffit comme indicateur visuel tout en cachant beaucoup moins de texte

**2. Ajouter du padding horizontal dans la TabsList**
- Ajouter `px-1` au `TabsList` pour creer un petit espace interne aux extremites
- Cela garantit que le premier et le dernier onglet ne sont pas colles au bord

### Fichiers modifies

**`src/components/ui/ScrollableTabsList.tsx`** et **`soccer-spot-reserve/src/components/ui/ScrollableTabsList.tsx`**
- Ligne 38 : changer `w-10` en `w-6` pour le degrade gauche
- Ligne 41 : changer `w-10` en `w-6` pour le degrade droit

### Resultat
Les onglets aux extremites seront entierement visibles quand on scrolle a fond, et les degradees restent visibles comme indicateur de scroll sans cacher le texte.

