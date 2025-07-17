
import { geocodeAddress, loadGoogleMaps } from './googleMapsUtils';
import { validateAddress } from './addressValidation';

export interface GeocodingResult {
  success: boolean;
  coordinates?: { lat: number; lng: number };
  formattedAddress?: string;
  error?: string;
  suggestions?: string[];
}

export class EnhancedGeocodingService {
  private static instance: EnhancedGeocodingService;
  private isInitialized = false;
  private retryCount = 0;
  private maxRetries = 3;

  static getInstance(): EnhancedGeocodingService {
    if (!EnhancedGeocodingService.instance) {
      EnhancedGeocodingService.instance = new EnhancedGeocodingService();
    }
    return EnhancedGeocodingService.instance;
  }

  async initialize(): Promise<boolean> {
    if (this.isInitialized) return true;

    try {
      await loadGoogleMaps();
      this.isInitialized = true;
      console.log('✅ Service de géocodage initialisé');
      return true;
    } catch (error) {
      console.error('❌ Erreur initialisation service géocodage:', error);
      return false;
    }
  }

  async geocodeWithValidation(address: string, city: string): Promise<GeocodingResult> {
    // Validation préalable
    const validation = validateAddress(address, city);
    if (!validation.isValid) {
      return {
        success: false,
        error: validation.errors.join(', '),
        suggestions: validation.suggestions
      };
    }

    // Initialisation si nécessaire
    if (!this.isInitialized) {
      const initialized = await this.initialize();
      if (!initialized) {
        return {
          success: false,
          error: 'Impossible d\'initialiser le service de géocodage'
        };
      }
    }

    return await this.geocodeWithRetry(address, city);
  }

  private async geocodeWithRetry(address: string, city: string): Promise<GeocodingResult> {
    const fullAddress = `${address}, ${city}, Côte d'Ivoire`;
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        console.log(`🔍 Tentative ${attempt}/${this.maxRetries} de géocodage:`, fullAddress);
        
        const coordinates = await geocodeAddress(fullAddress);
        
        if (coordinates) {
          console.log('✅ Géocodage réussi:', coordinates);
          return {
            success: true,
            coordinates,
            formattedAddress: fullAddress
          };
        } else {
          console.warn(`⚠️ Tentative ${attempt} échouée - aucun résultat`);
          
          if (attempt === this.maxRetries) {
            return {
              success: false,
              error: 'Adresse non trouvée par Google Maps',
              suggestions: [
                'Vérifiez l\'orthographe de l\'adresse',
                'Ajoutez plus de détails (rue, quartier)',
                'Utilisez un point de repère connu'
              ]
            };
          }
        }
      } catch (error) {
        console.error(`❌ Erreur tentative ${attempt}:`, error);
        
        if (attempt === this.maxRetries) {
          return {
            success: false,
            error: `Erreur technique: ${error instanceof Error ? error.message : 'Inconnue'}`
          };
        }
      }
      
      // Attendre avant la prochaine tentative
      await this.delay(1000 * attempt);
    }

    return {
      success: false,
      error: 'Toutes les tentatives ont échoué'
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Méthode pour géocoder plusieurs adresses avec gestion de la limite de taux
  async geocodeBatch(addresses: Array<{address: string, city: string}>): Promise<GeocodingResult[]> {
    const results: GeocodingResult[] = [];
    
    for (let i = 0; i < addresses.length; i++) {
      const { address, city } = addresses[i];
      console.log(`📍 Géocodage ${i + 1}/${addresses.length}:`, address);
      
      const result = await this.geocodeWithValidation(address, city);
      results.push(result);
      
      // Pause entre chaque géocodage pour respecter les limites de l'API
      if (i < addresses.length - 1) {
        await this.delay(200);
      }
    }
    
    return results;
  }
}

// Export d'une instance singleton
export const geocodingService = EnhancedGeocodingService.getInstance();
