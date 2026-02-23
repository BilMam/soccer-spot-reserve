
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader, MapPin, Locate, Shield, CreditCard, Info } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ImageUpload from '@/components/ImageUpload';
import FieldBasicInfoForm from './FieldBasicInfoForm';
import FieldScheduleForm from './FieldScheduleForm';
import FieldAmenitiesForm from './FieldAmenitiesForm';
import FieldPayoutAccountForm from './FieldPayoutAccountForm';
import ErrorAlert from '@/components/ErrorAlert';
import { useGeocodingService } from '@/hooks/useGeocodingService';
import { reverseGeocodeREST } from '@/utils/googleMapsUtils';
import { toast } from 'sonner';
import { calculatePublicPrice, calculateGuaranteeBreakdown } from '@/utils/publicPricing';

interface EditFieldFormProps {
  fieldId: string;
}

const EditFieldForm: React.FC<EditFieldFormProps> = ({ fieldId }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast: uiToast } = useToast();
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    location: '',
    address: '',
    city: '',
    field_type: '',
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
    payout_account_id: '' as string,
    // Garantie Terrain Bloqué
    guarantee_enabled: false,
    guarantee_percentage: '20',
    full_payment_enabled: true
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldOwner, setFieldOwner] = useState<string | null>(null);
  const [locationSource, setLocationSource] = useState<'geocoding' | 'geolocation' | null>(null);
  const [resolvedAddress, setResolvedAddress] = useState<string | null>(null);
  const initialLoadDone = useRef(false);

  const { 
    geocodeFieldAddress, 
    getCurrentLocation,
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

  useEffect(() => {
    const fetchField = async () => {
      if (!fieldId || !user) return;
      
      console.log('Fetching field with ID:', fieldId);
      console.log('Current user ID:', user.id);
      
      try {
        setError(null);
        const { data, error } = await supabase
          .from('fields')
          .select(`
            *,
            net_price_1h,
            net_price_1h30,
            net_price_2h,
            public_price_1h,
            public_price_1h30,
            public_price_2h,
            guarantee_enabled,
            guarantee_percentage,
            payment_mode
          `)
          .eq('id', fieldId)
          .maybeSingle();

        if (error) {
          console.error('Error fetching field:', error);
          throw error;
        }
        
        if (!data) {
          setError('Terrain introuvable. Il a peut-être été supprimé.');
          return;
        }

        console.log('Field data:', data);
        console.log('Field owner ID:', data.owner_id);
        console.log('Current user ID:', user.id);

        // Vérifier si l'utilisateur est le propriétaire
        if (data.owner_id !== user.id) {
          setError('Vous n\'êtes pas autorisé à modifier ce terrain. Seul le propriétaire peut le faire.');
          return;
        }

        setFieldOwner(data.owner_id);
        setFormData({
          name: data.name,
          description: data.description || '',
          location: data.location,
          address: data.address,
          city: data.city,
          field_type: data.field_type,
          capacity: data.capacity.toString(),
          price_per_hour: (data.net_price_1h || data.price_per_hour).toString(),
          price_1h30: (data.net_price_1h30 || data.price_1h30)?.toString() || '',
          price_2h: (data.net_price_2h || data.price_2h)?.toString() || '',
          availability_start: data.availability_start || '08:00',
          availability_end: data.availability_end || '22:00',
          amenities: data.amenities || [],
          images: data.images || [],
          latitude: data.latitude || null,
          longitude: data.longitude || null,
          payout_account_id: data.payout_account_id || '',
          // Garantie Terrain Bloqué
          guarantee_enabled: data.guarantee_enabled || false,
          guarantee_percentage: (data.guarantee_percentage || 20).toString(),
          full_payment_enabled: data.payment_mode !== 'guarantee'
        });

        // Définir la source de localisation si les coordonnées existent
        if (data.latitude && data.longitude) {
          setLocationSource('geocoding');
        }
      } catch (error: any) {
        console.error('Error in fetchField:', error);
        setError(`Impossible de charger les données du terrain: ${error.message}`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchField();
  }, [fieldId, user, navigate, uiToast]);

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

  // Géocodage automatique avec debounce
  // Géocodage automatique avec debounce - skip si coordonnées déjà présentes
  useEffect(() => {
    if (!isApiReady || locationSource === 'geolocation') return;
    // Ne pas re-geocoder si des coordonnées valides existent déjà
    if (formData.latitude !== null && formData.longitude !== null) return;

    const timer = setTimeout(() => {
      if (formData.address && formData.city) {
        performGeocode(formData.address, formData.city);
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [formData.address, formData.city, isApiReady, performGeocode, locationSource, formData.latitude, formData.longitude]);

  // Reverse geocoding REST pour afficher une adresse lisible
  useEffect(() => {
    if (!formData.latitude || !formData.longitude) return;

    let cancelled = false;
    const fetchAddress = async () => {
      const address = await reverseGeocodeREST(formData.latitude!, formData.longitude!);
      if (!cancelled && address) {
        setResolvedAddress(address);
      }
    };

    fetchAddress();
    return () => { cancelled = true; };
  }, [formData.latitude, formData.longitude]);

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
    if (!user || !fieldId) {
      setError('Utilisateur non connecté ou ID du terrain manquant.');
      return;
    }
    
    // Vérification supplémentaire des permissions
    if (fieldOwner && fieldOwner !== user.id) {
      setError('Vous n\'êtes pas autorisé à modifier ce terrain.');
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    console.log('Submitting update for field:', fieldId);
    console.log('User ID:', user.id);
    console.log('Field owner ID:', fieldOwner);
    
    try {
      // Calculer les prix nets et publics
      const netPrice1h = parseFloat(formData.price_per_hour);
      const netPrice1h30 = formData.price_1h30 ? parseFloat(formData.price_1h30) : null;
      const netPrice2h = formData.price_2h ? parseFloat(formData.price_2h) : null;

      const publicPrice1h = calculatePublicPrice(netPrice1h);
      const publicPrice1h30 = netPrice1h30 ? calculatePublicPrice(netPrice1h30) : null;
      const publicPrice2h = netPrice2h ? calculatePublicPrice(netPrice2h) : null;

      // Calculer le payment_mode
      let paymentMode: 'full' | 'guarantee' | 'both' = 'full';
      if (formData.full_payment_enabled && formData.guarantee_enabled) {
        paymentMode = 'both';
      } else if (!formData.full_payment_enabled && formData.guarantee_enabled) {
        paymentMode = 'guarantee';
      } else {
        paymentMode = 'full';
      }

      const updateData: Record<string, any> = {
        name: formData.name,
        description: formData.description,
        location: formData.location,
        address: formData.address,
        city: formData.city,
        field_type: formData.field_type,
        capacity: parseInt(formData.capacity),
        // Colonnes NET (ce que le propriétaire touche)
        net_price_1h: netPrice1h,
        net_price_1h30: netPrice1h30,
        net_price_2h: netPrice2h,
        // Colonnes PUBLIC (ce que le client paie)
        public_price_1h: publicPrice1h,
        public_price_1h30: publicPrice1h30,
        public_price_2h: publicPrice2h,
        // Colonnes legacy (pour rétrocompatibilité)
        price_per_hour: netPrice1h,
        price_1h30: netPrice1h30,
        price_2h: netPrice2h,
        availability_start: formData.availability_start,
        availability_end: formData.availability_end,
        amenities: formData.amenities,
        images: formData.images,
        latitude: formData.latitude,
        longitude: formData.longitude,
        payout_account_id: formData.payout_account_id || null,
        // Garantie Terrain Bloqué
        guarantee_enabled: formData.guarantee_enabled,
        guarantee_percentage: parseInt(formData.guarantee_percentage),
        payment_mode: paymentMode,
        updated_at: new Date().toISOString()
      };

      console.log('Update data:', updateData);

      const { data, error } = await supabase
        .from('fields')
        .update(updateData)
        .eq('id', fieldId)
        .eq('owner_id', user.id)
        .select()
        .maybeSingle();

      if (error) {
        console.error('Supabase update error:', error);
        throw error;
      }

      console.log('Update result:', data);

      if (!data) {
        throw new Error('Aucune ligne mise à jour. Vérifiez que vous êtes bien le propriétaire de ce terrain.');
      }

      uiToast({
        title: "Terrain mis à jour",
        description: "Les modifications ont été sauvegardées avec succès.",
      });

      navigate('/owner/dashboard');
    } catch (error: any) {
      console.error('Error in handleSubmit:', error);
      const errorMessage = error.message || 'Erreur inconnue lors de la mise à jour';
      setError(`Impossible de mettre à jour le terrain: ${errorMessage}`);
      uiToast({
        title: "Erreur",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLocationLoading = isGeocoding || isGeolocating;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <Loader className="w-6 h-6 animate-spin" />
          <span>Chargement...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto">
        <ErrorAlert 
          message={error}
          onDismiss={() => {
            setError(null);
            navigate('/owner/dashboard');
          }}
        />
        <div className="mt-4 text-center">
          <Button onClick={() => navigate('/owner/dashboard')}>
            Retour au dashboard
          </Button>
        </div>
      </div>
    );
  }

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
              ✅ Terrain localisé {locationSource === 'geolocation' ? '(via votre position)' : '(via l\'adresse)'} : {resolvedAddress || `${formData.latitude.toFixed(6)}, ${formData.longitude.toFixed(6)}`}
            </span>
          </div>
        )}

        {/* Erreurs de géocodage */}
        {geocodingError && (
          <div className="text-sm text-red-600 flex items-center p-3 bg-red-50 rounded-md">
            <span>❌ {geocodingError}</span>
          </div>
        )}

        {/* Bouton de géolocalisation */}
        {isApiReady && (
          <div className="flex flex-wrap gap-2">
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
          <FieldBasicInfoForm formData={formData} onInputChange={handleInputChange} />
          
          <FieldScheduleForm formData={formData} onInputChange={handleInputChange} />

          <FieldAmenitiesForm 
            amenities={formData.amenities} 
            onAmenityChange={handleAmenityChange} 
          />

          <FieldPayoutAccountForm
            payoutAccountId={formData.payout_account_id}
            onPayoutAccountChange={handlePayoutAccountChange}
          />

          {/* Section Garantie Terrain Bloqué */}
          <div className="space-y-4 border-t pt-6">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-5 h-5 text-green-600" />
              <h3 className="text-lg font-semibold">Mode de paiement</h3>
            </div>

            {/* Toggle Paiement complet */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <CreditCard className="w-5 h-5 text-gray-500" />
                <div>
                  <Label className="text-sm font-medium">Paiement complet en ligne</Label>
                  <p className="text-xs text-gray-500">Le joueur paie 100% en ligne</p>
                </div>
              </div>
              <Switch
                checked={formData.full_payment_enabled}
                onCheckedChange={(checked) => {
                  // Ne pas permettre de désactiver les deux
                  if (!checked && !formData.guarantee_enabled) return;
                  setFormData(prev => ({ ...prev, full_payment_enabled: checked }));
                }}
              />
            </div>

            {/* Toggle Garantie */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-green-600" />
                <div>
                  <Label className="text-sm font-medium">Garantie Terrain Bloqué</Label>
                  <p className="text-xs text-gray-500">Le joueur paie une avance en ligne puis le solde en cash sur place</p>
                </div>
              </div>
              <Switch
                checked={formData.guarantee_enabled}
                onCheckedChange={(checked) => {
                  // Ne pas permettre de désactiver les deux
                  if (!checked && !formData.full_payment_enabled) return;
                  setFormData(prev => ({ ...prev, guarantee_enabled: checked }));
                }}
              />
            </div>

            {/* Erreur si aucun mode actif */}
            {!formData.full_payment_enabled && !formData.guarantee_enabled && (
              <p className="text-sm text-red-600">Au moins un mode de paiement doit être actif.</p>
            )}

            {/* Options garantie si activée */}
            {formData.guarantee_enabled && (
              <div className="ml-4 p-4 bg-green-50 border border-green-200 rounded-lg space-y-4">
                <div>
                  <Label className="text-sm font-medium">Pourcentage d'avance</Label>
                  <Select
                    value={formData.guarantee_percentage}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, guarantee_percentage: value }))}
                  >
                    <SelectTrigger className="w-full mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10%</SelectItem>
                      <SelectItem value="20">20% (recommandé)</SelectItem>
                      <SelectItem value="30">30%</SelectItem>
                      <SelectItem value="50">50%</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Récapitulatif dynamique */}
                {formData.price_per_hour && (
                  <div className="p-3 bg-white border rounded text-sm space-y-1">
                    {(() => {
                      const netPrice = parseFloat(formData.price_per_hour);
                      if (!netPrice || netPrice <= 0) return null;
                      const pct = parseInt(formData.guarantee_percentage) / 100;
                      const breakdown = calculateGuaranteeBreakdown(netPrice, pct);
                      return (
                        <>
                          <p className="font-medium text-gray-700 mb-2">Exemple pour 1h (net {netPrice.toLocaleString()} XOF) :</p>
                          <div className="flex justify-between text-gray-600">
                            <span>Avance en ligne :</span>
                            <span className="font-medium">{breakdown.depositPublic.toLocaleString()} XOF</span>
                          </div>
                          <div className="flex justify-between text-gray-600">
                            <span>Frais opérateurs (3%) :</span>
                            <span>{breakdown.operatorFee.toLocaleString()} XOF</span>
                          </div>
                          <div className="flex justify-between text-green-700 font-medium">
                            <span>Total débité en ligne :</span>
                            <span>{breakdown.totalOnline.toLocaleString()} XOF</span>
                          </div>
                          <div className="flex justify-between text-orange-600 font-medium">
                            <span>Solde cash sur place :</span>
                            <span>{breakdown.balanceCash.toLocaleString()} XOF</span>
                          </div>
                          <div className="flex justify-between text-gray-700 font-bold border-t pt-1 mt-1">
                            <span>Vous recevez au total :</span>
                            <span>{netPrice.toLocaleString()} XOF</span>
                          </div>
                          <div className="flex items-start gap-1.5 mt-2 text-xs text-blue-600">
                            <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                            <span>Commission PISport : {breakdown.depositCommission.toLocaleString()} XOF (sur l'avance uniquement)</span>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <Label>Photos du terrain</Label>
            <ImageUpload
              images={formData.images}
              onImagesChange={handleImagesChange}
              maxImages={10}
            />
          </div>

          <div className="flex justify-end space-x-4 pt-6">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => navigate('/owner/dashboard')}
            >
              Annuler
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting || isLocationLoading}
              className="bg-green-600 hover:bg-green-700"
            >
              {isSubmitting ? 'Mise à jour...' : 'Mettre à jour'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default EditFieldForm;
