
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MapPin, Check, X, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { validateAddress, suggestAddressCorrections } from '@/utils/addressValidation';
import { geocodeAddress } from '@/utils/googleMapsUtils';

interface Field {
  id: string;
  name: string;
  address: string;
  city: string;
  location: string;
  latitude?: number;
  longitude?: number;
}

const FieldAddressCorrection: React.FC = () => {
  const [fields, setFields] = useState<Field[]>([]);
  const [loading, setLoading] = useState(true);
  const [geocoding, setGeocoding] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchFieldsWithoutCoordinates();
  }, []);

  const fetchFieldsWithoutCoordinates = async () => {
    try {
      const { data, error } = await supabase
        .from('fields')
        .select('id, name, address, city, location, latitude, longitude')
        .or('latitude.is.null,longitude.is.null')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFields(data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des terrains:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les terrains",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const updateFieldAddress = async (fieldId: string, newAddress: string, newCity: string, newLocation: string) => {
    try {
      const { error } = await supabase
        .from('fields')
        .update({
          address: newAddress,
          city: newCity,
          location: newLocation,
          updated_at: new Date().toISOString()
        })
        .eq('id', fieldId);

      if (error) throw error;

      setFields(prev => prev.map(field => 
        field.id === fieldId 
          ? { ...field, address: newAddress, city: newCity, location: newLocation }
          : field
      ));

      toast({
        title: "Adresse mise à jour",
        description: "L'adresse a été corrigée avec succès"
      });
    } catch (error) {
      console.error('Erreur mise à jour adresse:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour l'adresse",
        variant: "destructive"
      });
    }
  };

  const geocodeField = async (field: Field) => {
    setGeocoding(field.id);
    
    try {
      const fullAddress = `${field.address}, ${field.city}, Côte d'Ivoire`;
      console.log('🔍 Géocodage de:', fullAddress);
      
      const coordinates = await geocodeAddress(fullAddress);
      
      if (coordinates) {
        const { error } = await supabase
          .from('fields')
          .update({
            latitude: coordinates.lat,
            longitude: coordinates.lng,
            updated_at: new Date().toISOString()
          })
          .eq('id', field.id);

        if (error) throw error;

        setFields(prev => prev.map(f => 
          f.id === field.id 
            ? { ...f, latitude: coordinates.lat, longitude: coordinates.lng }
            : f
        ));

        toast({
          title: "Géocodage réussi",
          description: `Terrain "${field.name}" géocodé avec succès`
        });
      } else {
        toast({
          title: "Échec du géocodage",
          description: `Impossible de géocoder "${field.name}". Vérifiez l'adresse.`,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Erreur géocodage:', error);
      toast({
        title: "Erreur",
        description: "Erreur lors du géocodage",
        variant: "destructive"
      });
    } finally {
      setGeocoding(null);
    }
  };

  const geocodeAllFields = async () => {
    const fieldsToGeocode = fields.filter(f => !f.latitude || !f.longitude);
    
    for (const field of fieldsToGeocode) {
      await geocodeField(field);
      // Petite pause entre chaque géocodage
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="w-4 h-4 animate-spin mr-2" />
            Chargement...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <MapPin className="w-5 h-5" />
          <span>Correction des adresses de terrains</span>
        </CardTitle>
        <div className="flex justify-between items-center">
          <p className="text-sm text-gray-600">
            {fields.length} terrain(s) sans coordonnées GPS
          </p>
          <Button onClick={geocodeAllFields} disabled={geocoding !== null}>
            <MapPin className="w-4 h-4 mr-2" />
            Géocoder tous les terrains
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {fields.map((field) => (
          <FieldCorrectionCard
            key={field.id}
            field={field}
            onUpdateAddress={updateFieldAddress}
            onGeocode={geocodeField}
            isGeocoding={geocoding === field.id}
          />
        ))}
        
        {fields.length === 0 && (
          <Alert>
            <Check className="w-4 h-4" />
            <AlertDescription>
              Tous les terrains ont des coordonnées GPS ! 🎉
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

interface FieldCorrectionCardProps {
  field: Field;
  onUpdateAddress: (fieldId: string, address: string, city: string, location: string) => void;
  onGeocode: (field: Field) => void;
  isGeocoding: boolean;
}

const FieldCorrectionCard: React.FC<FieldCorrectionCardProps> = ({
  field,
  onUpdateAddress,
  onGeocode,
  isGeocoding
}) => {
  const [address, setAddress] = useState(field.address);
  const [city, setCity] = useState(field.city);
  const [location, setLocation] = useState(field.location);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const validation = validateAddress(address, city);
  const suggestions = suggestAddressCorrections(address);

  const handleSave = () => {
    onUpdateAddress(field.id, address, city, location);
  };

  const applySuggestion = (suggestion: string) => {
    const parts = suggestion.split(', ');
    if (parts.length >= 3) {
      setAddress(parts.slice(0, -2).join(', '));
      setLocation(parts[parts.length - 2]);
      setCity(parts[parts.length - 1]);
    } else {
      setAddress(suggestion);
    }
    setShowSuggestions(false);
  };

  return (
    <Card className="border-l-4 border-l-orange-400">
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="font-semibold">{field.name}</h3>
            <p className="text-sm text-gray-600">
              GPS: {field.latitude && field.longitude 
                ? `${field.latitude.toFixed(6)}, ${field.longitude.toFixed(6)}` 
                : 'Non géocodé'
              }
            </p>
          </div>
          <div className="flex space-x-2">
            <Button
              onClick={() => onGeocode(field)}
              disabled={isGeocoding}
              size="sm"
              variant="outline"
            >
              {isGeocoding ? (
                <RefreshCw className="w-3 h-3 animate-spin" />
              ) : (
                <MapPin className="w-3 h-3" />
              )}
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <Label htmlFor={`address-${field.id}`}>Adresse</Label>
            <Input
              id={`address-${field.id}`}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Adresse complète"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor={`location-${field.id}`}>Quartier</Label>
              <Input
                id={`location-${field.id}`}
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Quartier"
              />
            </div>
            <div>
              <Label htmlFor={`city-${field.id}`}>Ville</Label>
              <Input
                id={`city-${field.id}`}
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Ville"
              />
            </div>
          </div>

          {!validation.isValid && (
            <Alert variant="destructive">
              <X className="w-4 h-4" />
              <AlertDescription>
                <div>
                  {validation.errors.map((error, i) => (
                    <div key={i}>• {error}</div>
                  ))}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {validation.suggestions.length > 0 && (
            <Alert>
              <AlertDescription>
                <div>
                  <strong>Suggestions:</strong>
                  {validation.suggestions.map((suggestion, i) => (
                    <div key={i}>• {suggestion}</div>
                  ))}
                </div>
              </AlertDescription>
            </Alert>
          )}

          <div className="flex justify-between items-center">
            <Button
              onClick={() => setShowSuggestions(!showSuggestions)}
              variant="outline"
              size="sm"
            >
              {showSuggestions ? 'Masquer' : 'Voir'} les suggestions
            </Button>
            
            <Button
              onClick={handleSave}
              disabled={!validation.isValid}
              size="sm"
            >
              Sauvegarder
            </Button>
          </div>

          {showSuggestions && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Suggestions d'adresses:</Label>
              {suggestions.map((suggestion, i) => (
                <Button
                  key={i}
                  onClick={() => applySuggestion(suggestion)}
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-left h-auto p-2"
                >
                  {suggestion}
                </Button>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default FieldAddressCorrection;
