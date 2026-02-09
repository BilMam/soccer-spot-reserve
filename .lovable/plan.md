
## Corriger l'affichage des onglets sur mobile

### Probleme identifie
Sur mobile, les onglets du dashboard proprietaire (6 onglets) et ceux de la gestion des creneaux (4 onglets) debordent et se chevauchent car ils sont trop nombreux pour tenir sur une seule ligne.

### Solution
Rendre les `TabsList` scrollables horizontalement sur mobile grace a des classes CSS, sans toucher au composant `tabs.tsx` global (pour ne pas impacter le reste de l'app).

### Modifications

**1. `src/pages/OwnerDashboard.tsx`** (ligne 81)
- Remplacer `<TabsList>` par `<TabsList className="flex w-full overflow-x-auto no-scrollbar">`
- Ajouter `className="whitespace-nowrap shrink-0"` sur chaque `TabsTrigger` pour empecher le texte de se couper

**2. `src/components/availability/AvailabilityManagement.tsx`** (ligne 91)
- Remplacer `<TabsList className="grid w-full grid-cols-4">` par `<TabsList className="flex w-full overflow-x-auto no-scrollbar">`
- Ajouter `className="whitespace-nowrap shrink-0"` sur chaque `TabsTrigger`

**3. `src/index.css`** -- Ajouter un utilitaire CSS pour masquer la scrollbar
```css
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
```

**4. Fichiers dans `soccer-spot-reserve/`** -- Appliquer les memes modifications aux fichiers equivalents.

### Resultat
- Sur mobile : les onglets restent lisibles et on peut les faire defiler horizontalement avec le doigt
- Sur desktop : aucun changement visible, tous les onglets tiennent deja dans l'ecran
