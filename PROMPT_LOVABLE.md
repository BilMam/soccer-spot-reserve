# 🎯 PROMPT POUR LOVABLE.DEV

Copier-coller ce prompt dans Lovable.dev :

---

## 🐛 PROBLÈME À CORRIGER

Les utilisateurs ne voient JAMAIS le champ code promo dans le checkout parce qu'ils ne passent jamais par la page Checkout. Actuellement, quand ils sélectionnent un créneau horaire sur la page FieldDetail, la réservation est créée IMMÉDIATEMENT et ils sont redirigés DIRECTEMENT vers PayDunya, en contournant complètement la page Checkout.

La page Checkout existe et fonctionne parfaitement (avec le champ code promo, la validation, les calculs de réduction, etc.), mais elle n'est JAMAIS visitée.

---

## ✅ SOLUTION À IMPLÉMENTER

Dans le fichier `src/pages/FieldDetail.tsx`, modifier la fonction `handleTimeSlotSelect` (ligne 99) pour :

1. **SUPPRIMER** toute la logique de création de réservation et d'appel PayDunya
2. **REMPLACER** par une simple navigation vers la page Checkout avec les données en state

---

## 📝 CODE À MODIFIER

### Fichier : `src/pages/FieldDetail.tsx`

**Remplacer la fonction `handleTimeSlotSelect` (lignes 99-189) par :**

```typescript
const handleTimeSlotSelect = (date: Date, startTime: string, endTime: string, subtotal: number, serviceFee: number, total: number) => {
  console.log('🎯 Sélection créneau dans FieldDetail:', {
    date: date.toISOString(),
    startTime,
    endTime,
    subtotal,
    serviceFee,
    total
  });

  if (!user) {
    toast({
      title: "Connexion requise",
      description: "Veuillez vous connecter pour réserver un terrain.",
      variant: "destructive"
    });
    navigate('/auth');
    return;
  }

  // Naviguer vers le checkout avec toutes les données nécessaires
  navigate(`/checkout/${id}`, {
    state: {
      selectedDate: date,
      selectedStartTime: startTime,
      selectedEndTime: endTime,
      subtotal: subtotal,
      serviceFee: serviceFee,
      totalPrice: total
    }
  });
};
```

**C'est tout !** La page Checkout existe déjà et gère :
- ✅ L'affichage du résumé de réservation
- ✅ Le champ code promo avec validation
- ✅ Le calcul des réductions
- ✅ La création de la réservation avec les données promo
- ✅ La redirection vers PayDunya avec le montant final

---

## 🔍 EXPLICATIONS TECHNIQUES

### Pourquoi cette modification ?

**AVANT (problématique) :**
```
FieldDetail → Sélection créneau → Création booking immédiate → PayDunya
                                  ❌ Pas de passage par Checkout
                                  ❌ Pas de code promo visible
```

**APRÈS (corrigé) :**
```
FieldDetail → Sélection créneau → Navigation vers Checkout → Code promo → Payer → Booking créé → PayDunya
                                  ✅ Page Checkout visitée
                                  ✅ Code promo visible et fonctionnel
```

### Ce qui sera supprimé de `handleTimeSlotSelect` :
- ❌ `setIsProcessingPayment(true)`
- ❌ Toute la logique try/catch
- ❌ L'insertion dans la table `bookings` (sera faite dans Checkout.tsx)
- ❌ L'appel à `supabase.functions.invoke('create-paydunya-invoice')`
- ❌ La redirection vers PayDunya

### Ce qui restera dans `handleTimeSlotSelect` :
- ✅ La vérification de l'utilisateur connecté
- ✅ La navigation vers `/checkout/:id` avec les données en state
- ✅ Le log de debug

---

## ✅ RÉSULTAT ATTENDU

Après cette modification, le flux utilisateur sera :

1. **Page FieldDetail** → Utilisateur voit le terrain et les promos disponibles
2. **Sélection créneau** → Clic sur un créneau horaire
3. **🆕 Page Checkout** → Affichage du résumé avec :
   - Image et infos du terrain
   - Date et horaire sélectionné
   - **🎉 Champ CODE PROMO visible et fonctionnel**
   - Prix original
   - Réduction (si code valide)
   - Prix après réduction
   - Frais opérateurs (3%)
   - Total à payer
4. **Bouton Payer** → Création de la réservation avec données promo
5. **PayDunya** → Paiement avec montant final (après réduction)

---

## 🎨 INTERFACE UTILISATEUR

L'utilisateur verra désormais sur la page Checkout :

```
┌────────────────────────────────────────────────┐
│  CHECKOUT                                      │
│                                                │
│  📸 [Image terrain]  Terrain de Yoff          │
│  📍 Yoff, Dakar                                │
│  ⭐ 4.5 (12 avis)                              │
│                                                │
│  📅 Vendredi 27 décembre 2025                 │
│  🕐 14:00 - 16:00 (2h)                        │
│                                                │
│  ┌──────────────────────────────────────────┐ │
│  │ 🏷️ Code promo                            │ │
│  │ [NOEL2024        ] [Appliquer]           │ │
│  └──────────────────────────────────────────┘ │
│                                                │
│  Location terrain    10,000 XOF (barré)       │
│  Réduction (NOEL)    -2,000 XOF               │
│  Sous-total           8,000 XOF               │
│  Frais opérateurs       240 XOF               │
│  ─────────────────────────────────────────    │
│  TOTAL À PAYER       8,240 XOF                │
│                                                │
│  [       Payer 8,240 XOF       ]              │
└────────────────────────────────────────────────┘
```

---

## 🚨 IMPORTANT

- **NE PAS MODIFIER** `src/pages/Checkout.tsx` (il est déjà parfait)
- **NE PAS MODIFIER** `src/components/checkout/PromoCodeInput.tsx`
- **NE PAS MODIFIER** `src/hooks/usePromoValidation.ts`
- **MODIFIER UNIQUEMENT** la fonction `handleTimeSlotSelect` dans `src/pages/FieldDetail.tsx`

---

## ✅ TESTS APRÈS MODIFICATION

1. Aller sur une page de terrain (ex: /field/abc123)
2. Sélectionner un créneau horaire
3. Vérifier que vous êtes redirigé vers `/checkout/abc123`
4. Vérifier que le champ "Code promo" est visible
5. Entrer un code promo valide (ex: NOEL2024)
6. Vérifier que le prix est recalculé avec la réduction
7. Cliquer sur "Payer"
8. Vérifier que la réservation est créée avec `promo_code_id` rempli
9. Vérifier la redirection vers PayDunya avec le bon montant

---

## 📊 VARIABLES STATE À PASSER AU CHECKOUT

```typescript
{
  selectedDate: Date,           // Date de réservation
  selectedStartTime: string,    // Heure début (ex: "14:00")
  selectedEndTime: string,      // Heure fin (ex: "16:00")
  subtotal: number,             // Prix public AVANT frais (ex: 10000)
  serviceFee: number,           // Frais opérateurs 3% (ex: 300)
  totalPrice: number            // subtotal + serviceFee (ex: 10300)
}
```

Ces variables sont déjà calculées et passées en paramètres à `handleTimeSlotSelect`, il suffit de les transférer au Checkout via `navigate`.

---

## 🎯 LIVRABLE FINAL

Après cette modification :
- ✅ Les utilisateurs VERRONT le champ code promo
- ✅ Les promotions fonctionneront de bout en bout
- ✅ Les stats d'utilisation seront trackées
- ✅ Meilleure UX avec une page de résumé avant paiement
- ✅ Possibilité de réviser la réservation avant de payer
