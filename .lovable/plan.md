

## Ajouter des indicateurs visuels de scroll sur les onglets mobile

### Probleme
Les onglets sont maintenant scrollables, mais rien n'indique visuellement a l'utilisateur qu'il peut faire defiler vers la droite pour voir plus d'onglets.

### Solution
Ajouter un effet de degrade (fondu) sur le bord droit de la barre d'onglets quand il y a du contenu cache. Cela donne un signal visuel clair que la liste continue au-dela de l'ecran.

### Approche technique
Creer un composant wrapper `ScrollableTabsList` qui :
1. Detecte si le contenu depasse (scroll possible)
2. Affiche un degrade a droite quand on peut scroller vers la droite
3. Affiche un degrade a gauche quand on a deja scrolle
4. Les degrades disparaissent quand on atteint le bout

### Modifications

**1. Nouveau fichier : `src/components/ui/ScrollableTabsList.tsx`**
- Composant qui wrappe `TabsList` avec un conteneur relatif
- Utilise `useRef` et `onScroll` pour detecter la position du scroll
- Affiche des pseudo-elements avec un degrade blanc vers transparent sur les bords
- Le degrade droit apparait par defaut (indiquant "il y a plus a droite")
- Le degrade gauche apparait quand l'utilisateur a scrolle

```text
+--------------------------------------------------+
| Onglet 1 | Onglet 2 | Onglet 3 | On...  ~~~fade |
+--------------------------------------------------+
                                    ^ degrade blanc
                                      signal visuel
```

**2. `src/pages/OwnerDashboard.tsx`**
- Remplacer `TabsList` par `ScrollableTabsList` pour les 6 onglets du dashboard

**3. `src/components/availability/AvailabilityManagement.tsx`**
- Remplacer `TabsList` par `ScrollableTabsList` pour les 4 onglets

**4. Fichiers dans `soccer-spot-reserve/`**
- Appliquer les memes modifications aux fichiers equivalents

### Details techniques du composant ScrollableTabsList

Le composant :
- Utilise un `div` parent en `position: relative` avec `overflow: hidden`
- Place la `TabsList` existante a l'interieur avec le scroll horizontal
- Ajoute deux `div` absolues pour les degradees (gauche et droite)
- Le degrade droit utilise `background: linear-gradient(to right, transparent, white)`
- Le degrade gauche utilise `background: linear-gradient(to left, transparent, white)`
- Un `useEffect` + `onScroll` verifie `scrollLeft` et `scrollWidth - clientWidth` pour afficher/masquer chaque degrade
- Le degrade fait environ 40px de large, juste assez pour signaler sans cacher trop de contenu
- Sur desktop, si tout tient sans scroll, aucun degrade n'apparait

### Resultat
- L'utilisateur voit immediatement que les onglets continuent grace au fondu sur le bord droit
- En scrollant, un fondu apparait aussi a gauche pour signaler qu'il peut revenir
- Sur desktop, rien ne change car tout tient deja dans l'ecran
