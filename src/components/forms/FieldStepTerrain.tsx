import React, { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin, RefreshCw, Locate } from 'lucide-react';
import { SPORTS, SPORT_FIELD_TYPES, SPORT_CAPACITIES, SportType } from '@/constants/sports';

interface GeocodingState {
  latitude: number | null;
  longitude: number | null;
  isGeocoding: boolean;
  isGeolocating: boolean;
  isApiReady: boolean;
  geocodingError: string | null;
  locationSource: 'geocoding' | 'geolocation' | null;
  resolvedAddress: string | null;
}

interface FieldStepTerrainProps {
  formData: {
    name: string;
    description: string;
    location: string;
    address: string;
    city: string;
    sport_type?: string;
    field_type: string;
    capacity: string;
  };
  onInputChange: (field: string, value: string) => void;
  geocodingState: GeocodingState;
  onManualGeocode: () => void;
  onUserGeolocation: () => void;
}

const FieldStepTerrain: React.FC<FieldStepTerrainProps> = ({
  formData,
  onInputChange,
  geocodingState,
  onManualGeocode,
  onUserGeolocation,
}) => {
  const [selectedSport, setSelectedSport] = useState<SportType>(
    (formData.sport_type as SportType) || 'football'
  );

  const fieldTypes = SPORT_FIELD_TYPES[selectedSport] || SPORT_FIELD_TYPES.football;
  const capacities = SPORT_CAPACITIES[selectedSport] || SPORT_CAPACITIES.football;

  const handleSportChange = (sport: SportType) => {
    setSelectedSport(sport);
    onInputChange('sport_type', sport);

    const firstFieldType = SPORT_FIELD_TYPES[sport][0]?.value;
    const firstCapacity = SPORT_CAPACITIES[sport][0]?.value;

    if (firstFieldType) onInputChange('field_type', firstFieldType);
    if (firstCapacity) onInputChange('capacity', firstCapacity.toString());
  };

  const isLocationLoading = geocodingState.isGeocoding || geocodingState.isGeolocating;

  return (
    <div className="space-y-5">
      {/* Sport + Nom */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="sport_type">Sport *</Label>
          <Select value={selectedSport} onValueChange={handleSportChange}>
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner le sport" />
            </SelectTrigger>
            <SelectContent>
              {SPORTS.map((sport) => (
                <SelectItem key={sport.value} value={sport.value}>
                  {sport.icon} {sport.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="name">Nom du terrain *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => onInputChange('name', e.target.value)}
            placeholder="Ex: Terrain de football Cocody"
            required
          />
        </div>
      </div>

      {/* Surface + Capacite */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="field_type">Type de surface *</Label>
          <Select
            value={formData.field_type || undefined}
            onValueChange={(value) => onInputChange('field_type', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner la surface" />
            </SelectTrigger>
            <SelectContent>
              {fieldTypes.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="capacity">Format *</Label>
          <Select
            value={formData.capacity || undefined}
            onValueChange={(value) => onInputChange('capacity', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner le format" />
            </SelectTrigger>
            <SelectContent>
              {capacities.map((cap) => (
                <SelectItem key={cap.value} value={cap.value.toString()}>
                  {cap.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Quartier + Ville */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="location">Quartier / Commune *</Label>
          <Input
            id="location"
            value={formData.location}
            onChange={(e) => onInputChange('location', e.target.value)}
            placeholder="Ex: Cocody, Plateau, Marcory"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="city">Ville *</Label>
          <Input
            id="city"
            value={formData.city}
            onChange={(e) => onInputChange('city', e.target.value)}
            placeholder="Ex: Abidjan"
            required
          />
        </div>
      </div>

      {/* Adresse complete */}
      <div className="space-y-2">
        <Label htmlFor="address">Adresse complète *</Label>
        <Input
          id="address"
          value={formData.address}
          onChange={(e) => onInputChange('address', e.target.value)}
          placeholder="Ex: Rue des Sports, Cocody, Abidjan"
          required
        />
        <p className="text-xs text-muted-foreground">
          Copiez l'adresse depuis Google Maps pour une localisation précise, ou utilisez le bouton ci-dessous.
        </p>
      </div>

      {/* Geocodage : statut + boutons */}
      <div className="space-y-3">
        {/* Statut de localisation reussie */}
        {geocodingState.latitude && geocodingState.longitude && (
          <div className="text-sm text-green-600 flex items-center space-x-2 p-2 bg-green-50 rounded-md">
            <MapPin className="w-4 h-4 shrink-0" />
            <span>
              Terrain localisé {geocodingState.locationSource === 'geolocation' ? '(via votre position)' : '(via l\'adresse)'} : {geocodingState.resolvedAddress || `${geocodingState.latitude.toFixed(4)}, ${geocodingState.longitude.toFixed(4)}`}
            </span>
          </div>
        )}

        {/* Chargement geocodage */}
        {geocodingState.isGeocoding && (
          <div className="text-sm text-blue-600 flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span>Localisation de l'adresse en cours...</span>
          </div>
        )}

        {geocodingState.isGeolocating && (
          <div className="text-sm text-purple-600 flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
            <span>Géolocalisation en cours...</span>
          </div>
        )}

        {/* Erreur de geocodage */}
        {geocodingState.geocodingError && (
          <div className="text-sm text-red-600 flex items-center justify-between p-2 bg-red-50 rounded-md">
            <span>{geocodingState.geocodingError}</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onManualGeocode}
              disabled={isLocationLoading || !geocodingState.isApiReady}
              className="ml-2"
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              Réessayer
            </Button>
          </div>
        )}

        {/* Boutons de localisation */}
        {geocodingState.isApiReady && (
          <div className="flex flex-wrap gap-2">
            {formData.address && formData.city && !geocodingState.latitude && !isLocationLoading && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onManualGeocode}
                disabled={isLocationLoading}
              >
                <MapPin className="w-4 h-4 mr-2" />
                Localiser l'adresse
              </Button>
            )}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onUserGeolocation}
              disabled={isLocationLoading || !geocodingState.isApiReady}
            >
              <Locate className="w-4 h-4 mr-2" />
              {geocodingState.isGeolocating ? 'Géolocalisation...' : 'Utiliser ma position'}
            </Button>
          </div>
        )}

        {/* Chargement Google Maps API */}
        {!geocodingState.isApiReady && (
          <div className="text-xs text-amber-600 flex items-center space-x-2">
            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-amber-600"></div>
            <span>Chargement de Google Maps...</span>
          </div>
        )}
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => onInputChange('description', e.target.value)}
          placeholder="Décrivez votre terrain, ses spécificités, les équipements disponibles..."
          rows={3}
        />
      </div>
    </div>
  );
};

export default FieldStepTerrain;
