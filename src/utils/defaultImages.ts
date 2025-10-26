import { SportType } from '@/constants/sports';

// Images par défaut Unsplash pour chaque sport
const DEFAULT_SPORT_IMAGES: Record<SportType, string> = {
  football: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
  basketball: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
  tennis: 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
  paddle: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
};

/**
 * Retourne l'image par défaut appropriée selon le type de sport
 * @param sportType - Le type de sport (football, basketball, tennis, paddle)
 * @returns URL de l'image par défaut correspondante
 */
export const getDefaultSportImage = (sportType?: string): string => {
  if (!sportType || !(sportType in DEFAULT_SPORT_IMAGES)) {
    return DEFAULT_SPORT_IMAGES.football;
  }
  return DEFAULT_SPORT_IMAGES[sportType as SportType];
};
