
## Harmoniser le style de l'adresse sur la page terrain

### Ce qui change

**Fichier : `src/pages/FieldDetail.tsx` (lignes 253-266)**

Actuellement, l'adresse entiere est un lien bleu (`text-blue-600`). On va :

1. Mettre l'icone MapPin en bleu (`text-blue-600`) pour indiquer visuellement que c'est cliquable/localisation
2. Garder le texte de l'adresse en couleur normale (`text-gray-700`) comme les autres infos
3. Le lien reste cliquable (ouvre Google Maps) mais avec un style discret : soulignement au survol seulement

**Avant :**
```
<MapPin className="w-5 h-5 mr-2" />  (gris)
<a className="text-blue-600 hover:underline">adresse</a>  (bleu)
```

**Apres :**
```
<MapPin className="w-5 h-5 mr-2 text-blue-600" />  (bleu)
<a className="text-gray-700 hover:underline hover:text-blue-600">adresse</a>  (gris normal, bleu au survol)
```

Le design sera coherent avec les autres lignes d'info (capacite, horaires) tout en gardant l'icone bleue pour signaler la localisation.
