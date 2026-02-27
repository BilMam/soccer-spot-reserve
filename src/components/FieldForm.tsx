import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, Banknote, Camera, ChevronLeft, ChevronRight, Loader } from 'lucide-react';
import { FormStepper } from '@/components/ui/form-stepper';
import FieldStepTerrain from '@/components/forms/FieldStepTerrain';
import FieldStepTarifs from '@/components/forms/FieldStepTarifs';
import FieldStepPhotos from '@/components/forms/FieldStepPhotos';
import { useGeocodingService } from '@/hooks/useGeocodingService';
import { reverseGeocode } from '@/utils/googleMapsUtils';
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

const STEPS = [
  { label: 'Le terrain', icon: MapPin },
  { label: 'Tarifs', icon: Banknote },
  { label: 'Photos & extras', icon: Camera },
];

const FieldForm: React.FC<FieldFormProps> = ({ onSubmit, isLoading }) => {
  const [currentStep, setCurrentStep] = useState(0);

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
  const [resolvedAddress, setResolvedAddress] = useState<string | null>(null);

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

  // Charger Google Maps API au montage
  useEffect(() => {
    initializeGoogleMaps();
  }, [initializeGoogleMaps]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    if ((field === 'address' || field === 'city') && geocodingError) {
      clearError();
    }

    if ((field === 'address' || field === 'city') && locationSource === 'geolocation') {
      setFormData(prev => ({
        ...prev,
        latitude: null,
        longitude: null
      }));
      setLocationSource(null);
    }
  };

  // Geocodage automatique avec debounce
  const performGeocode = useCallback(async (address: string, city: string) => {
    if (!address.trim() || !city.trim()) return;

    const result = await geocodeFieldAddress(address.trim(), city.trim());

    if (result) {
      setFormData(prev => ({
        ...prev,
        latitude: result.latitude,
        longitude: result.longitude
      }));
      setLocationSource('geocoding');
      toast.success('Adresse localisée avec succès !');
    } else if (geocodingError) {
      toast.error(geocodingError);
    }
  }, [geocodeFieldAddress, geocodingError]);

  useEffect(() => {
    if (!isApiReady || locationSource === 'geolocation') return;
    if (formData.latitude !== null && formData.longitude !== null) return;

    const timer = setTimeout(() => {
      if (formData.address && formData.city) {
        performGeocode(formData.address, formData.city);
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [formData.address, formData.city, isApiReady, performGeocode, locationSource, formData.latitude, formData.longitude]);

  // Reverse geocoding
  useEffect(() => {
    if (!formData.latitude || !formData.longitude || !isApiReady) return;

    let cancelled = false;
    reverseGeocode(formData.latitude, formData.longitude).then(address => {
      if (!cancelled && address) {
        setResolvedAddress(address);
      }
    });
    return () => { cancelled = true; };
  }, [formData.latitude, formData.longitude, isApiReady]);

  // Geocodage manuel
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
      toast.success('Adresse localisée avec succès !');
    }
  };

  // Geolocalisation utilisateur
  const handleUserGeolocation = async () => {
    const result = await getCurrentLocation();

    if (result) {
      setFormData(prev => ({
        ...prev,
        latitude: result.latitude,
        longitude: result.longitude,
        address: result.address.includes(',') ? result.address.split(',')[0].trim() : prev.address,
        city: result.address.includes(',') ? result.address.split(',')[1]?.trim() || prev.city : prev.city
      }));
      setLocationSource('geolocation');
      toast.success('Position géolocalisée avec succès !');
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

  // Validation par etape
  const canProceedToNext = (): boolean => {
    switch (currentStep) {
      case 0:
        return !!(
          formData.sport_type &&
          formData.name.trim() &&
          formData.field_type &&
          formData.capacity &&
          formData.location.trim() &&
          formData.city.trim() &&
          formData.address.trim() &&
          formData.latitude &&
          formData.longitude
        );
      case 1:
        return !!(
          formData.price_per_hour &&
          parseFloat(formData.price_per_hour) > 0 &&
          formData.availability_start &&
          formData.availability_end
        );
      case 2:
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      if (canProceedToNext()) {
        setCurrentStep(prev => prev + 1);
      } else if (currentStep === 0 && (!formData.latitude || !formData.longitude)) {
        toast.error('Veuillez localiser le terrain avant de continuer');
      }
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.latitude || !formData.longitude) {
      toast.error('Veuillez localiser le terrain en saisissant une adresse valide ou en utilisant votre position');
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

  const geocodingState = {
    latitude: formData.latitude,
    longitude: formData.longitude,
    isGeocoding,
    isGeolocating,
    isApiReady,
    geocodingError,
    locationSource,
    resolvedAddress,
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Nouveau terrain</CardTitle>
        <FormStepper steps={STEPS} currentStep={currentStep} className="pt-2" />
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit}>
          {/* Contenu de l'etape active */}
          <div className="min-h-[300px]">
            {currentStep === 0 && (
              <FieldStepTerrain
                formData={formData}
                onInputChange={handleInputChange}
                geocodingState={geocodingState}
                onManualGeocode={handleManualGeocode}
                onUserGeolocation={handleUserGeolocation}
              />
            )}

            {currentStep === 1 && (
              <FieldStepTarifs
                formData={formData}
                onInputChange={handleInputChange}
              />
            )}

            {currentStep === 2 && (
              <FieldStepPhotos
                images={formData.images}
                onImagesChange={handleImagesChange}
                amenities={formData.amenities}
                onAmenityChange={handleAmenityChange}
                payoutAccountId={formData.payout_account_id}
                onPayoutAccountChange={handlePayoutAccountChange}
              />
            )}
          </div>

          {/* Navigation */}
          <div className="flex justify-between pt-6 border-t mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={handlePrev}
              disabled={currentStep === 0}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Précédent
            </Button>

            {currentStep < STEPS.length - 1 ? (
              <Button
                type="button"
                onClick={handleNext}
                disabled={!canProceedToNext()}
              >
                Suivant
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={isLoading || isLocationLoading}
                className="bg-green-600 hover:bg-green-700"
              >
                {isLoading ? (
                  <>
                    <Loader className="mr-2 h-4 w-4 animate-spin" />
                    Soumission en cours...
                  </>
                ) : (
                  'Soumettre pour approbation'
                )}
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default FieldForm;
