

## Corriger le bouton "Terrain ouvert 24h/24"

### Probleme identifie
Dans `BasicConfigurationForm.tsx`, le `Switch` est enveloppe dans un `div` cliquable. Quand on clique sur le Switch :
1. Le `onCheckedChange` du Switch se declenche (toggle ON)
2. Le `onClick` du `div` parent se declenche aussi (toggle OFF)

Resultat : les deux evenements s'annulent et rien ne change visuellement.

### Solution
Ajouter `e.stopPropagation()` sur le Switch pour empecher l'evenement de remonter au `div` parent. Ainsi :
- Cliquer sur le Switch = un seul toggle (via `onCheckedChange`)
- Cliquer sur le texte/zone autour = un seul toggle (via `onClick` du div)

### Fichiers a modifier

**`src/components/availability/BasicConfigurationForm.tsx`** (ligne 48)
- Envelopper le Switch dans un `div` avec `onClick={(e) => e.stopPropagation()}`

**`soccer-spot-reserve/src/components/availability/BasicConfigurationForm.tsx`**
- Meme modification

### Detail technique
```text
Avant :
  <Switch checked={is24h} onCheckedChange={handle24hToggle} />

Apres :
  <div onClick={(e) => e.stopPropagation()}>
    <Switch checked={is24h} onCheckedChange={handle24hToggle} />
  </div>
```

