import React, { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin, Info } from 'lucide-react';
import { calculatePublicPrice, calculateNetFromPublic, formatXOF, calculatePlatformCommission } from '@/utils/publicPricing';

interface FieldBasicInfoFormProps {
  formData: {
    name: string;
    description: string;
    location: string;
    address: string;
    city: string;
    field_type: string;
    capacity: string;
    price_per_hour: string;
    price_1h30?: string;
    price_2h?: string;
  };
  onInputChange: (field: string, value: string) => void;
}

const fieldTypes = [
  { value: 'synthetic', label: 'Synthétique' },
  { value: 'natural_grass', label: 'Pelouse naturelle' },
  { value: 'street', label: 'Street' }
];

const gameFormats = [
  { value: '10', label: '5v5 (10 joueurs)' },
  { value: '12', label: '6v6 (12 joueurs)' },
  { value: '14', label: '7v7 (14 joueurs)' },
  { value: '16', label: '8v8 (16 joueurs)' },
  { value: '18', label: '9v9 (18 joueurs)' },
  { value: '20', label: '10v10 (20 joueurs)' },
  { value: '22', label: '11v11 (22 joueurs)' }
];

const FieldBasicInfoForm: React.FC<FieldBasicInfoFormProps> = ({ formData, onInputChange }) => {
  // États pour les prix nets et publics (bi-directionnalité)
  const [netPrice1h, setNetPrice1h] = useState(formData.price_per_hour || '');
  const [publicPrice1h, setPublicPrice1h] = useState('');
  const [lastEdited1h, setLastEdited1h] = useState<'net' | 'public'>('net');

  const [netPrice1h30, setNetPrice1h30] = useState(formData.price_1h30 || '');
  const [publicPrice1h30, setPublicPrice1h30] = useState('');
  const [lastEdited1h30, setLastEdited1h30] = useState<'net' | 'public'>('net');

  const [netPrice2h, setNetPrice2h] = useState(formData.price_2h || '');
  const [publicPrice2h, setPublicPrice2h] = useState('');
  const [lastEdited2h, setLastEdited2h] = useState<'net' | 'public'>('net');

  // Synchroniser avec formData initial
  useEffect(() => {
    if (formData.price_per_hour && !netPrice1h) {
      setNetPrice1h(formData.price_per_hour);
      const calculatedPublic = calculatePublicPrice(parseFloat(formData.price_per_hour));
      setPublicPrice1h(calculatedPublic.toString());
    }
    if (formData.price_1h30 && !netPrice1h30) {
      setNetPrice1h30(formData.price_1h30);
      const calculatedPublic = calculatePublicPrice(parseFloat(formData.price_1h30));
      setPublicPrice1h30(calculatedPublic.toString());
    }
    if (formData.price_2h && !netPrice2h) {
      setNetPrice2h(formData.price_2h);
      const calculatedPublic = calculatePublicPrice(parseFloat(formData.price_2h));
      setPublicPrice2h(calculatedPublic.toString());
    }
  }, [formData, netPrice1h, netPrice1h30, netPrice2h]);

  // Gestionnaires pour 1h
  const handleNetPrice1hChange = (value: string) => {
    setNetPrice1h(value);
    setLastEdited1h('net');
    onInputChange('price_per_hour', value);
    
    const numValue = parseFloat(value);
    if (value && numValue > 0) {
      const calculatedPublic = calculatePublicPrice(numValue);
      setPublicPrice1h(calculatedPublic.toString());
    } else {
      setPublicPrice1h('');
    }
  };

  const handlePublicPrice1hChange = (value: string) => {
    setPublicPrice1h(value);
    setLastEdited1h('public');
    
    const numValue = parseFloat(value);
    if (value && numValue > 0) {
      const calculatedNet = calculateNetFromPublic(numValue);
      setNetPrice1h(calculatedNet.toString());
      onInputChange('price_per_hour', calculatedNet.toString());
    } else {
      setNetPrice1h('');
      onInputChange('price_per_hour', '');
    }
  };

  // Gestionnaires pour 1h30
  const handleNetPrice1h30Change = (value: string) => {
    setNetPrice1h30(value);
    setLastEdited1h30('net');
    onInputChange('price_1h30', value);
    
    const numValue = parseFloat(value);
    if (value && numValue > 0) {
      const calculatedPublic = calculatePublicPrice(numValue);
      setPublicPrice1h30(calculatedPublic.toString());
    } else {
      setPublicPrice1h30('');
    }
  };

  const handlePublicPrice1h30Change = (value: string) => {
    setPublicPrice1h30(value);
    setLastEdited1h30('public');
    
    const numValue = parseFloat(value);
    if (value && numValue > 0) {
      const calculatedNet = calculateNetFromPublic(numValue);
      setNetPrice1h30(calculatedNet.toString());
      onInputChange('price_1h30', calculatedNet.toString());
    } else {
      setNetPrice1h30('');
      onInputChange('price_1h30', '');
    }
  };

  // Gestionnaires pour 2h
  const handleNetPrice2hChange = (value: string) => {
    setNetPrice2h(value);
    setLastEdited2h('net');
    onInputChange('price_2h', value);
    
    const numValue = parseFloat(value);
    if (value && numValue > 0) {
      const calculatedPublic = calculatePublicPrice(numValue);
      setPublicPrice2h(calculatedPublic.toString());
    } else {
      setPublicPrice2h('');
    }
  };

  const handlePublicPrice2hChange = (value: string) => {
    setPublicPrice2h(value);
    setLastEdited2h('public');
    
    const numValue = parseFloat(value);
    if (value && numValue > 0) {
      const calculatedNet = calculateNetFromPublic(numValue);
      setNetPrice2h(calculatedNet.toString());
      onInputChange('price_2h', calculatedNet.toString());
    } else {
      setNetPrice2h('');
      onInputChange('price_2h', '');
    }
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
        
        <div className="space-y-2">
          <Label htmlFor="field_type">Type de surface *</Label>
          <Select 
            value={formData.field_type || undefined} 
            onValueChange={(value) => onInputChange('field_type', value)}
            required
          >
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner le type de surface" />
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
          <Label htmlFor="capacity">Capacité (nombre de joueurs) *</Label>
          <Select 
            value={formData.capacity || undefined} 
            onValueChange={(value) => onInputChange('capacity', value)}
            required
          >
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner le format" />
            </SelectTrigger>
            <SelectContent>
              {gameFormats.map((format) => (
                <SelectItem key={format.value} value={format.value}>
                  {format.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="md:col-span-2">
          <div className="space-y-6">
            <div>
              <h3 className="text-base font-semibold text-gray-900 mb-2">Tarification avec commission 3%</h3>
              <p className="text-sm text-gray-600">
                Définissez vos prix nets et voyez automatiquement les prix publics affichés aux clients.
              </p>
            </div>

            {/* Prix 1h */}
            <div className="space-y-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center space-x-2 mb-3">
                <h4 className="text-base font-semibold text-gray-900">Prix 1 heure</h4>
                <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">Obligatoire</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="net_price_1h" className="text-sm font-medium text-gray-700">
                    💰 Prix net que vous touchez (XOF)
                  </Label>
                  <Input
                    id="net_price_1h"
                    type="number"
                    min="0"
                    value={netPrice1h}
                    onChange={(e) => handleNetPrice1hChange(e.target.value)}
                    placeholder="Ex: 35000"
                    required
                    className="font-semibold"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="public_price_1h" className="text-sm font-medium text-gray-700">
                    👥 Prix affiché au client (XOF)
                  </Label>
                  <Input
                    id="public_price_1h"
                    type="number"
                    min="0"
                    value={publicPrice1h}
                    onChange={(e) => handlePublicPrice1hChange(e.target.value)}
                    placeholder="Calculé automatiquement"
                    className="font-semibold bg-green-50 border-green-300"
                  />
                </div>
              </div>

              {netPrice1h && publicPrice1h && (
                <div className="bg-primary/5 border border-primary/20 rounded-md p-3 text-xs">
                  <p className="text-muted-foreground">
                    Commission plateforme : <strong>{formatXOF(calculatePlatformCommission(parseFloat(publicPrice1h), parseFloat(netPrice1h)))}</strong>
                  </p>
                </div>
              )}
            </div>

            {/* Prix 1h30 */}
            <div className="space-y-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center space-x-2 mb-3">
                <h4 className="text-base font-semibold text-gray-900">Prix 1h30</h4>
                <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">Obligatoire</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="net_price_1h30" className="text-sm font-medium text-gray-700">
                    💰 Prix net que vous touchez (XOF)
                  </Label>
                  <Input
                    id="net_price_1h30"
                    type="number"
                    min="0"
                    value={netPrice1h30}
                    onChange={(e) => handleNetPrice1h30Change(e.target.value)}
                    placeholder="Ex: 50000"
                    required
                    className="font-semibold"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="public_price_1h30" className="text-sm font-medium text-gray-700">
                    👥 Prix affiché au client (XOF)
                  </Label>
                  <Input
                    id="public_price_1h30"
                    type="number"
                    min="0"
                    value={publicPrice1h30}
                    onChange={(e) => handlePublicPrice1h30Change(e.target.value)}
                    placeholder="Calculé automatiquement"
                    className="font-semibold bg-green-50 border-green-300"
                  />
                </div>
              </div>

              {netPrice1h30 && publicPrice1h30 && (
                <div className="bg-primary/5 border border-primary/20 rounded-md p-3 text-xs">
                  <p className="text-muted-foreground">
                    Commission plateforme : <strong>{formatXOF(calculatePlatformCommission(parseFloat(publicPrice1h30), parseFloat(netPrice1h30)))}</strong>
                  </p>
                </div>
              )}
            </div>

            {/* Prix 2h */}
            <div className="space-y-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center space-x-2 mb-3">
                <h4 className="text-base font-semibold text-gray-900">Prix 2 heures</h4>
                <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">Obligatoire</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="net_price_2h" className="text-sm font-medium text-gray-700">
                    💰 Prix net que vous touchez (XOF)
                  </Label>
                  <Input
                    id="net_price_2h"
                    type="number"
                    min="0"
                    value={netPrice2h}
                    onChange={(e) => handleNetPrice2hChange(e.target.value)}
                    placeholder="Ex: 60000"
                    required
                    className="font-semibold"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="public_price_2h" className="text-sm font-medium text-gray-700">
                    👥 Prix affiché au client (XOF)
                  </Label>
                  <Input
                    id="public_price_2h"
                    type="number"
                    min="0"
                    value={publicPrice2h}
                    onChange={(e) => handlePublicPrice2hChange(e.target.value)}
                    placeholder="Calculé automatiquement"
                    className="font-semibold bg-green-50 border-green-300"
                  />
                </div>
              </div>

              {netPrice2h && publicPrice2h && (
                <div className="bg-primary/5 border border-primary/20 rounded-md p-3 text-xs">
                  <p className="text-muted-foreground">
                    Commission plateforme : <strong>{formatXOF(calculatePlatformCommission(parseFloat(publicPrice2h), parseFloat(netPrice2h)))}</strong>
                  </p>
                </div>
              )}
            </div>

            {/* Bloc explicatif général */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start space-x-2">
                <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-2">💡 Comment ça marche :</p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li><strong>Vous recevez 100% de votre prix net.</strong> Aucune déduction n'est faite sur votre montant.</li>
                    <li>La commission plateforme (environ 3%) est payée par le client, pas par vous.</li>
                    <li>Vous pouvez modifier soit le prix net, soit le prix public. L'autre se recalcule automatiquement.</li>
                    <li>Les prix publics sont arrondis commercialement (.000 ou .500) pour un affichage professionnel.</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="location">Quartier/Commune *</Label>
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

      <div className="space-y-2">
        <Label htmlFor="address">Adresse complète *</Label>
        <Input
          id="address"
          value={formData.address}
          onChange={(e) => onInputChange('address', e.target.value)}
          placeholder="Ex: Rue des Sports, Cocody, Abidjan"
          required
        />
        
        {/* Indication d'aide pour l'adresse */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-start space-x-2">
            <MapPin className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">💡 Conseil pour une localisation précise :</p>
              <p>
                Copiez l'adresse directement depuis <strong>Google Maps</strong> et collez-la ici, 
                ou utilisez le bouton <strong>"Utiliser ma position"</strong> ci-dessus pour une géolocalisation automatique.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => onInputChange('description', e.target.value)}
          placeholder="Décrivez votre terrain, ses spécificités, les équipements disponibles..."
          rows={4}
        />
      </div>
    </>
  );
};

export default FieldBasicInfoForm;
