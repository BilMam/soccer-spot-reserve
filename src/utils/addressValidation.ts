
export interface AddressValidationResult {
  isValid: boolean;
  suggestions: string[];
  errors: string[];
}

// Quartiers populaires d'Abidjan avec leurs variations
export const ABIDJAN_NEIGHBORHOODS = [
  'Cocody',
  'Plateau',
  'Adjamé',
  'Marcory',
  'Treichville',
  'Yopougon',
  'Koumassi',
  'Port-Bouët',
  'Abobo',
  'Attécoubé',
  'Bingerville',
  'Anyama',
  'Songon'
];

// Rues/Boulevards connus d'Abidjan
export const ABIDJAN_STREETS = [
  'Boulevard de la République',
  'Boulevard Giscard d\'Estaing',
  'Rue Jesse Jackson',
  'Boulevard de l\'Université',
  'Avenue Chardy',
  'Boulevard Lagunaire',
  'Boulevard VGE',
  'Avenue Houphouët-Boigny',
  'Route de Bassam',
  'Boulevard de Marseille'
];

// Landmarks connus d'Abidjan
export const ABIDJAN_LANDMARKS = [
  'Université Félix Houphouët-Boigny',
  'Palais de la Culture',
  'Stade Félix Houphouët-Boigny',
  'Port d\'Abidjan',
  'Aéroport d\'Abidjan',
  'Marché de Cocody',
  'Marché Gouro',
  'Campus Universitaire',
  'Riviera Palmeraie',
  'II Plateaux'
];

export const validateAddress = (address: string, city: string): AddressValidationResult => {
  const errors: string[] = [];
  const suggestions: string[] = [];
  
  if (!address || address.trim().length < 5) {
    errors.push('L\'adresse doit contenir au moins 5 caractères');
  }
  
  if (!city || city.toLowerCase() !== 'abidjan') {
    errors.push('La ville doit être "Abidjan"');
    suggestions.push('Utilisez "Abidjan" comme ville');
  }
  
  // Vérifier si l'adresse contient un quartier connu
  const hasKnownNeighborhood = ABIDJAN_NEIGHBORHOODS.some(neighborhood => 
    address.toLowerCase().includes(neighborhood.toLowerCase())
  );
  
  if (!hasKnownNeighborhood) {
    suggestions.push('Ajoutez un quartier connu d\'Abidjan (ex: Cocody, Plateau, Adjamé)');
  }
  
  // Vérifier les codes étranges
  if (address.includes('+') && address.length < 10) {
    errors.push('Format d\'adresse non reconnu. Utilisez une adresse complète');
    suggestions.push('Exemple: "Boulevard de la République, Plateau, Abidjan"');
  }
  
  // Suggestions d'amélioration
  if (address.length < 20) {
    suggestions.push('Ajoutez plus de détails (rue, quartier, point de repère)');
  }
  
  return {
    isValid: errors.length === 0,
    suggestions,
    errors
  };
};

export const suggestAddressCorrections = (address: string): string[] => {
  const suggestions: string[] = [];
  const lowerAddress = address.toLowerCase();
  
  // Suggestions basées sur des mots-clés
  if (lowerAddress.includes('université') || lowerAddress.includes('univ')) {
    suggestions.push('Université Félix Houphouët-Boigny, Cocody, Abidjan');
  }
  
  if (lowerAddress.includes('stade')) {
    suggestions.push('Stade Félix Houphouët-Boigny, Plateau, Abidjan');
  }
  
  if (lowerAddress.includes('port')) {
    suggestions.push('Port d\'Abidjan, Treichville, Abidjan');
  }
  
  if (lowerAddress.includes('marché')) {
    suggestions.push('Marché de Cocody, Cocody, Abidjan');
    suggestions.push('Marché Gouro, Adjamé, Abidjan');
  }
  
  // Suggestions générales
  if (suggestions.length === 0) {
    suggestions.push('Boulevard de la République, Plateau, Abidjan');
    suggestions.push('Rue Jesse Jackson, Cocody, Abidjan');
    suggestions.push('Boulevard Giscard d\'Estaing, Cocody, Abidjan');
  }
  
  return suggestions;
};
