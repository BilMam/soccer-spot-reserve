
import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, RefreshCw, Locate } from 'lucide-react';
import FieldBasicInfoForm from '@/components/forms/FieldBasicInfoForm';
import FieldScheduleForm from '@/components/forms/FieldScheduleForm';
import FieldAmenitiesForm from '@/components/forms/FieldAmenitiesForm';
import FieldImageForm from '@/components/forms/FieldImageForm';
import FieldPayoutAccountForm from '@/components/forms/FieldPayoutAccountForm';
import FieldFormActions from '@/components/forms/FieldFormActions';
import { useGeocodingService } from '@/hooks/useGeocodingService';
import { toast } from 'sonner';

interface FieldFormData {
  name: string;
  description: string;
  location: string;
  address: string;
  city: string;
  sport_type?: string;
  price_per_hour: number;
  price_1h30?: number;
  price_2h?: number;
  capacity: number;
  field_type: 'natural_grass' | 'synthetic' | 'street';
  availability_start: string;
  availability_end: string;
  amenities: string[];
  images: string[];
  latitude?: number;
  longitude?: number;
  payout_account_id?: string;
}

interface FieldFormProps {
  onSubmit: (fieldData: FieldFormData) => Promise<void>;
  isLoading: boolean;
}

const FieldForm: React.FC<FieldFormProps> = ({ onSubmit, isLoading }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    location: '',
    address: '',
    city: '',
    sport_type: 'football',
    field_type: 'synthetic',
    capacity: '',
    price_per_hour: '',
    price_1h30: '',
    price_2h: '',
    availability_start: '08:00',
    availability_end: '22:00',
    amenities: [] as string[],
    images: [] as string[],
    latitude: null as number | null,
    longitude: null as number | null,
    payout_account_id: ''
  });

  const [locationSource, setLocationSource] = useState<'geocoding' | 'geolocation' | null>(null);

  const { 
    geocodeFieldAddress, 
    getCurrentLocation,
    manualGeocode,
    isLoading: isGeocoding,
    isGeolocating,
    error: geocodingError,
    isApiReady,
    initializeGoogleMaps,
    clearError
  } = useGeocodingService();

  // Charger Google Maps API au montage du composant
  useEffect(() => {
    initializeGoogleMaps();
  }, [initializeGoogleMaps]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Effacer les coordonnées et les erreurs quand l'utilisateur modifie l'adresse
    if ((field === 'address' || field === 'city') && geocodingError) {
      clearError();
    }
    
    // Si l'utilisateur modifie l'adresse après avoir utilisé la géolocalisation, effacer les coordonnées
    if ((field === 'address' || field === 'city') && locationSource === 'geolocation') {
      setFormData(prev => ({
        ...prev,
        latitude: null,
        longitude: null
      }));
      setLocationSource(null);
    }
  };

  // Fonction de géocodage avec debounce
  const performGeocode = useCallback(async (address: string, city: string) => {
    if (!address.trim() || !city.trim()) return;
    
    console.log('🔍 Début du géocodage automatique...');
    const result = await geocodeFieldAddress(address.trim(), city.trim());
    
    if (result) {
      setFormData(prev => ({
        ...prev,
        latitude: result.latitude,
        longitude: result.longitude
      }));
      setLocationSource('geocoding');
      toast.success('📍 Adresse localisée avec succès !');
    } else if (geocodingError) {
      toast.error(`❌ ${geocodingError}`);
    }
  }, [geocodeFieldAddress, geocodingError]);

  // Géocodage automatique avec debounce amélioré
  useEffect(() => {
    if (!isApiReady || locationSource === 'geolocation') return;

    const timer = setTimeout(() => {
      if (formData.address && formData.city) {
        performGeocode(formData.address, formData.city);
      }
    }, 2000); // Attendre 2 secondes après la dernière modification

    return () => clearTimeout(timer);
  }, [formData.address, formData.city, isApiReady, performGeocode, locationSource]);

  // Géocodage manuel
  const handleManualGeocode = async () => {
    if (!formData.address.trim() || !formData.city.trim()) {
      toast.error('Veuillez saisir une adresse et une ville');
      return;
    }

    const result = await manualGeocode(formData.address.trim(), formData.city.trim());
    
    if (result) {
      setFormData(prev => ({
        ...prev,
        latitude: result.latitude,
        longitude: result.longitude
      }));
      setLocationSource('geocoding');
      toast.success('📍 Adresse localisée avec succès !');
    }
  };

  // Géolocalisation utilisateur
  const handleUserGeolocation = async () => {
    const result = await getCurrentLocation();
    
    if (result) {
      setFormData(prev => ({
        ...prev,
        latitude: result.latitude,
        longitude: result.longitude,
        // Optionnellement pré-remplir l'adresse si elle a été trouvée
        address: result.address.includes(',') ? result.address.split(',')[0].trim() : prev.address,
        city: result.address.includes(',') ? result.address.split(',')[1]?.trim() || prev.city : prev.city
      }));
      setLocationSource('geolocation');
      toast.success('📍 Position géolocalisée avec succès !');
    }
  };

  const handleAmenityChange = (amenity: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      amenities: checked
        ? [...prev.amenities, amenity]
        : prev.amenities.filter(a => a !== amenity)
    }));
  };

  const handleImagesChange = (images: string[]) => {
    setFormData(prev => ({ ...prev, images }));
  };

  const handlePayoutAccountChange = (accountId: string) => {
    setFormData(prev => ({ ...prev, payout_account_id: accountId }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.latitude || !formData.longitude) {
      toast.error('📍 Veuillez localiser le terrain en saisissant une adresse valide ou en utilisant votre position');
      return;
    }
    
    const fieldData: FieldFormData = {
      name: formData.name,
      description: formData.description,
      location: formData.location,
      address: formData.address,
      city: formData.city,
      sport_type: formData.sport_type,
      field_type: formData.field_type as 'natural_grass' | 'synthetic' | 'street',
      capacity: parseInt(formData.capacity),
      price_per_hour: parseFloat(formData.price_per_hour),
      availability_start: formData.availability_start,
      availability_end: formData.availability_end,
      amenities: formData.amenities,
      images: formData.images,
      latitude: formData.latitude,
      longitude: formData.longitude,
      payout_account_id: formData.payout_account_id || undefined,
    };

    await onSubmit(fieldData);
  };

  const isLocationLoading = isGeocoding || isGeolocating;

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Informations du terrain</CardTitle>
        
        {/* État de l'API Google Maps */}
        {!isApiReady && (
          <div className="text-sm text-amber-600 flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-amber-600"></div>
            <span>Chargement de Google Maps...</span>
          </div>
        )}

        {/* État du géocodage */}
        {isGeocoding && (
          <div className="text-sm text-blue-600 flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span>Localisation de l'adresse en cours...</span>
          </div>
        )}

        {/* État de la géolocalisation */}
        {isGeolocating && (
          <div className="text-sm text-purple-600 flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
            <span>Géolocalisation en cours...</span>
          </div>
        )}

        {/* État de localisation réussie */}
        {formData.latitude && formData.longitude && (
          <div className="text-sm text-green-600 flex items-center space-x-2">
            <MapPin className="w-4 h-4" />
            <span>
              ✅ Terrain localisé {locationSource === 'geolocation' ? '(via votre position)' : '(via l\'adresse)'} : {formData.latitude.toFixed(6)}, {formData.longitude.toFixed(6)}
            </span>
          </div>
        )}

        {/* Erreurs de géocodage */}
        {geocodingError && (
          <div className="text-sm text-red-600 flex items-center justify-between p-3 bg-red-50 rounded-md">
            <span>❌ {geocodingError}</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleManualGeocode}
              disabled={isLocationLoading || !isApiReady}
              className="ml-2"
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              Réessayer
            </Button>
          </div>
        )}

        {/* Boutons de localisation */}
        {isApiReady && (
          <div className="flex flex-wrap gap-2">
            {/* Bouton de géocodage manuel */}
            {formData.address && formData.city && !formData.latitude && !isLocationLoading && (
              <Button
                type="button"
                variant="outline"
                onClick={handleManualGeocode}
                disabled={isLocationLoading}
              >
                <MapPin className="w-4 h-4 mr-2" />
                Localiser l'adresse
              </Button>
            )}

            {/* Bouton de géolocalisation */}
            <Button
              type="button"
              variant="outline"
              onClick={handleUserGeolocation}
              disabled={isLocationLoading || !isApiReady}
              className="flex items-center"
            >
              <Locate className="w-4 h-4 mr-2" />
              {isGeolocating ? 'Géolocalisation...' : 'Utiliser ma position'}
            </Button>
          </div>
        )}
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <FieldBasicInfoForm
            formData={formData}
            onInputChange={handleInputChange}
          />

          <FieldScheduleForm
            formData={formData}
            onInputChange={handleInputChange}
          />

          <FieldAmenitiesForm
            amenities={formData.amenities}
            onAmenityChange={handleAmenityChange}
          />

          <FieldImageForm
            images={formData.images}
            onImagesChange={handleImagesChange}
          />

          <FieldPayoutAccountForm
            payoutAccountId={formData.payout_account_id}
            onPayoutAccountChange={handlePayoutAccountChange}
          />

          <FieldFormActions isLoading={isLoading || isLocationLoading} />
        </form>
      </CardContent>
    </Card>
  );
};

export default FieldForm;
