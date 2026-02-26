# Prompt Optimisé — Redesign UX "Garantie Terrain Bloqué"

## Prompt prêt à copier-coller sur Lovable :

---

Je veux refaire le design UX de la fonctionnalité "Garantie Terrain Bloqué" sur 3 pages. L'objectif principal : **supprimer les doublons d'information, alléger l'interface, et rendre le flux clair et professionnel**. Toutes les modifications doivent être mobile-first et responsive.

## Page 1 : Interface de réservation (SlotBookingInterface + BookingSummary + PaymentTypeSelector)

### Problème actuel
Quand l'utilisateur sélectionne un créneau et choisit "Garantie Terrain Bloqué", les mêmes informations (avance en ligne, frais opérateurs, total à payer, solde cash) s'affichent **deux fois** : une fois dans le BookingSummary (carte grise en haut) et une fois dans le PaymentTypeSelector (carte verte en bas quand déplié). Il y a aussi deux info-boxes bleues identiques.

### Ce que je veux

**1. Supprimer la ligne "Créneau" du BookingSummary** (déjà visible dans les sélecteurs d'heure au-dessus). **Garder "Durée" et "Tarif appliqué"** car ils apportent un contexte utile au récapitulatif.

**2. Fusionner BookingSummary et PaymentTypeSelector en un seul bloc cohérent.** L'ordre doit être :
- D'abord le sélecteur de mode de paiement (Paiement complet vs Garantie Terrain Bloqué) sous forme de 2 cartes radio cliquables
- Puis EN DESSOUS, un seul récapitulatif de prix qui s'adapte dynamiquement selon le mode sélectionné
- Le récapitulatif commence par Durée + Tarif appliqué (communs aux deux modes, séparés par un trait fin)
- Puis les lignes de prix spécifiques au mode choisi
- Une seule info-box bleue pour le solde cash (uniquement visible en mode Garantie)

**3. Le récapitulatif de prix (unique, pas dupliqué) doit afficher :**
- **En-tête commun** : Durée → Tarif appliqué (séparé par un trait fin du reste)
- En mode "Paiement complet" : Sous-total → Frais opérateurs (3%) → **Total**
- En mode "Garantie" : Avance en ligne → Frais opérateurs (3%) → **Total à payer maintenant** → Solde à régler sur place (en orange) → Info-box bleue

**4. Les cartes radio du sélecteur doivent rester simples :**
- Carte "Paiement complet" : icône CreditCard + label + prix total en gras à droite
- Carte "Garantie Terrain Bloqué" : icône Shield + label + sous-label "Avance X% + solde cash" + prix avance en gras à droite
- PAS de détail déplié dans les cartes radio elles-mêmes — le détail est dans le récapitulatif en dessous

**5. Style des cartes radio :**
- Carte sélectionnée : border-2 border-green-500 bg-green-50
- Carte non sélectionnée : border border-gray-200 hover:border-gray-300
- Radio button visuel (cercle vert quand sélectionné)

**6. Le bouton d'action en bas doit s'adapter :**
- Mode complet : "Réserver (XX XXX XOF)" en vert standard
- Mode garantie : icône Shield + "Bloquer le terrain (X XXX XOF)" en vert émeraude

### Fichiers concernés
- `src/components/calendar/BookingSummary.tsx`
- `src/components/calendar/PaymentTypeSelector.tsx`
- `src/components/calendar/SlotBookingInterface.tsx`
- `src/components/calendar/SlotBookingActions.tsx`

---

## Page 2 : Page de confirmation (BookingSuccess.tsx)

### Problème actuel
La section "Informations importantes" affiche trop de points génériques (email de confirmation, rappel 24h, contacter le propriétaire, PayDunya). C'est du bruit visuel. De plus, le format des heures affiche les secondes (03:00:00 au lieu de 03:00).

### Ce que je veux

**1. Supprimer entièrement la card "Informations importantes"** avec ses 5 bullet points. Ce sont des informations génériques qui n'apportent pas de valeur et alourdissent la page.

**2. Garder UNIQUEMENT :**
- La card de succès en haut (Shield vert + "Terrain bloqué !" + badge "Garantie Terrain Bloqué" + texte)
- La card "Détails de votre réservation" avec : lieu, date, horaire, avance payée, solde à régler
- Ajouter UNE SEULE ligne d'info discrète en bas de la card détails : "Présentez-vous et réglez le solde de XX XOF directement au propriétaire" dans un encart orange clair (déjà présent mais le déplacer à l'intérieur de la card Détails)
- Les 2 boutons d'action en bas

**3. Formater les heures SANS secondes :** afficher "03:00 - 04:00" au lieu de "03:00:00 - 04:00:00". Le format `start_time` et `end_time` vient de la DB au format HH:MM:SS, il faut le tronquer à HH:MM dans l'affichage.

**4. Pour le mode paiement complet (non-deposit), même simplification :** supprimer la card "Informations importantes", ne garder que la card succès + card détails + boutons.

### Fichier concerné
- `src/pages/BookingSuccess.tsx`

---

## Page 3 : Mes Réservations (affichage des cartes de booking dans UserBookings)

### Ce que je veux
Quand une réservation a `payment_type === 'deposit'` et `payment_status === 'deposit_paid'`, la carte de réservation doit afficher :
- Un petit badge "Garantie" (icône Shield + texte) en vert émeraude à côté du statut
- Afficher "Avance payée : X XOF" au lieu de "Total payé : X XOF"
- Afficher en dessous en orange discret : "Solde restant : X XOF (cash sur place)"

### Fichier concerné
- `src/components/UserBookings.tsx`

---

## Contraintes globales

- **Mobile-first responsive** sur tous les breakpoints (Tailwind + Shadcn)
- **Ne touche PAS** à la logique de paiement, aux hooks, aux edge functions, ni aux calculs de prix dans `publicPricing.ts`
- **Ne modifie PAS** les props interfaces — adapte uniquement le rendu JSX et les styles
- Garde la palette actuelle : vert (green-500/600) pour confirmé, émeraude (emerald-600) pour garantie, orange pour le solde cash, bleu pour les info-boxes
- Tous les montants restent formatés avec `.toLocaleString()` + " XOF"
