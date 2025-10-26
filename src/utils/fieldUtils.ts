/**
 * Traduit le type de surface du terrain en français
 * @param fieldType - Le type de surface technique (ex: synthetic_grass)
 * @returns Le label français correspondant
 */
export const getFieldTypeLabel = (fieldType: string): string => {
  const translations: Record<string, string> = {
    // Football
    synthetic: 'Synthétique',
    natural_grass: 'Pelouse naturelle',
    street: 'Bitume',
    
    // Tennis
    clay: 'Terre battue',
    hard: 'Surface dure',
    grass: 'Gazon',
    
    // Paddle
    synthetic_grass: 'Synthétique',
    concrete: 'Béton',
    
    // Basketball
    parquet: 'Parquet',
    outdoor: 'Extérieur',
    
    // Commun
    indoor: 'Indoor',
  };
  
  return translations[fieldType] || fieldType;
};
