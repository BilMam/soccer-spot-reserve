

## Ajouter le drill-down jour par jour sur le graphique des revenus (vue terrain)

### Ce qui change

Quand le proprietaire est en **vue terrain** et voit le graphique "Evolution des revenus" avec les points par date, il pourra **cliquer sur un point** pour voir le detail de cette journee specifique.

### Comportement actuel

- Graphique gauche : courbe des revenus par date (points cliquables... mais rien ne se passe)
- Graphique droite : "Reservations par creneaux" qui agrege TOUS les creneaux sur toute la periode -- pas tres utile

### Nouveau comportement

**1. Clic sur un point du graphique des revenus**

Quand on clique sur un point (une date), une section "detail du jour" apparait en dessous des graphiques, montrant :
- La date selectionnee en titre (ex: "Samedi 15 fevrier 2025")
- Un tableau avec chaque reservation de ce jour : creneau horaire, prix total, revenus nets
- Le total des gains de la journee

**2. Remplacement du graphique "creneaux les plus prises"**

Le graphique de droite change dynamiquement :
- **Sans jour selectionne** : affiche les creneaux les plus prises sur toute la periode (comme avant, mais avec une indication claire "Sur toute la periode")
- **Avec un jour selectionne** : affiche les creneaux reserves CE jour-la specifiquement, avec les montants

**3. Indicateur visuel sur le graphique**

Le point clique sur la courbe sera mis en surbrillance (couleur differente, taille plus grande) pour montrer quel jour est selectionne. Un bouton "Deselectionner" permettra de revenir a la vue globale.

### Modifications techniques

**Fichier : `src/components/OwnerStats.tsx`**

1. Ajouter un state `selectedDate` (string | null) pour suivre le jour selectionne
2. Ajouter un handler `onClick` sur les points du `LineChart` (via la prop `onClick` de recharts) qui capture la date cliquee
3. Ajouter un `useMemo` pour filtrer les `bookingDetails` du jour selectionne
4. Modifier le graphique de droite pour s'adapter au contexte (jour selectionne ou vue globale)
5. Ajouter une section "Detail du jour" sous les graphiques quand un jour est selectionne :
   - Titre avec la date formatee
   - Tableau : creneau | prix total | revenus nets
   - Total de la journee
6. Ajouter un point actif visuellement distinct sur le graphique (dot customise avec `activeDot`)
7. Bouton "Retour a la vue periode" pour deselectionner le jour

**Aucune modification cote hook ou base de donnees** -- les `bookingDetails` contiennent deja toutes les informations necessaires (booking_date, start_time, end_time, total_price, owner_amount). Le filtrage se fait cote composant avec `useMemo`.

### Schema d'interaction

```text
Vue terrain (periode)
  |
  +-- Graphique revenus (courbe)
  |     |
  |     +-- [Clic sur point "15/02"] 
  |           |
  |           +-- Point mis en surbrillance
  |           +-- Graphique droite -> creneaux DU 15/02
  |           +-- Section "Detail du 15 fevrier" apparait
  |                 |
  |                 +-- 08:00-09:00 | 15 000 XOF | 14 250 XOF
  |                 +-- 18:00-19:00 | 20 000 XOF | 19 000 XOF
  |                 +-- Total : 35 000 XOF | 33 250 XOF
  |
  +-- [Bouton "Retour vue periode"] -> deselectionne
```

### Fichier a modifier

- `src/components/OwnerStats.tsx` uniquement (logique de filtrage + UI du drill-down)

