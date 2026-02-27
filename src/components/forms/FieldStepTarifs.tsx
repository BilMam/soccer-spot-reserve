import React, { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { ArrowRight } from 'lucide-react';
import { calculatePublicPrice, calculateNetFromPublic } from '@/utils/publicPricing';

interface FieldStepTarifsProps {
  formData: {
    price_per_hour: string;
    price_1h30?: string;
    price_2h?: string;
    availability_start: string;
    availability_end: string;
  };
  onInputChange: (field: string, value: string) => void;
}

// Sous-composant pour une ligne de prix compacte
const PricingRow: React.FC<{
  label: string;
  required?: boolean;
  netValue: string;
  publicValue: string;
  onNetChange: (value: string) => void;
  onPublicChange: (value: string) => void;
  placeholder?: string;
}> = ({ label, required, netValue, publicValue, onNetChange, onPublicChange, placeholder }) => {
  return (
    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
      <div className="w-14 shrink-0">
        <span className="text-sm font-medium text-gray-700">
          {label}{required && ' *'}
        </span>
      </div>

      <div className="flex-1 min-w-0">
        <Input
          type="number"
          min="0"
          value={netValue}
          onChange={(e) => onNetChange(e.target.value)}
          placeholder={placeholder || 'Prix net'}
          className="h-9 text-sm font-medium"
          required={required}
        />
      </div>

      <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />

      <div className="flex-1 min-w-0">
        <Input
          type="number"
          min="0"
          value={publicValue}
          onChange={(e) => onPublicChange(e.target.value)}
          placeholder="Prix public"
          className="h-9 text-sm font-medium bg-green-50 border-green-300"
        />
      </div>
    </div>
  );
};

const FieldStepTarifs: React.FC<FieldStepTarifsProps> = ({ formData, onInputChange }) => {
  // Etats locaux pour les prix nets et publics
  const [netPrice1h, setNetPrice1h] = useState(formData.price_per_hour || '');
  const [publicPrice1h, setPublicPrice1h] = useState('');

  const [netPrice1h30, setNetPrice1h30] = useState(formData.price_1h30 || '');
  const [publicPrice1h30, setPublicPrice1h30] = useState('');

  const [netPrice2h, setNetPrice2h] = useState(formData.price_2h || '');
  const [publicPrice2h, setPublicPrice2h] = useState('');

  // Initialiser les prix publics depuis les prix nets au montage
  useEffect(() => {
    if (formData.price_per_hour && !publicPrice1h) {
      setNetPrice1h(formData.price_per_hour);
      setPublicPrice1h(calculatePublicPrice(parseFloat(formData.price_per_hour)).toString());
    }
    if (formData.price_1h30 && !publicPrice1h30) {
      setNetPrice1h30(formData.price_1h30);
      setPublicPrice1h30(calculatePublicPrice(parseFloat(formData.price_1h30)).toString());
    }
    if (formData.price_2h && !publicPrice2h) {
      setNetPrice2h(formData.price_2h);
      setPublicPrice2h(calculatePublicPrice(parseFloat(formData.price_2h)).toString());
    }
  }, [formData.price_per_hour, formData.price_1h30, formData.price_2h]);

  // Handler generique pour changement de prix net
  const handleNetChange = (
    value: string,
    setNet: (v: string) => void,
    setPublic: (v: string) => void,
    formField: string
  ) => {
    setNet(value);
    onInputChange(formField, value);
    const num = parseFloat(value);
    if (value && num > 0) {
      setPublic(calculatePublicPrice(num).toString());
    } else {
      setPublic('');
    }
  };

  // Handler generique pour changement de prix public
  const handlePublicChange = (
    value: string,
    setNet: (v: string) => void,
    setPublic: (v: string) => void,
    formField: string
  ) => {
    setPublic(value);
    const num = parseFloat(value);
    if (value && num > 0) {
      const calculatedNet = calculateNetFromPublic(num);
      setNet(calculatedNet.toString());
      onInputChange(formField, calculatedNet.toString());
    } else {
      setNet('');
      onInputChange(formField, '');
    }
  };

  return (
    <div className="space-y-6">
      {/* Section Tarification */}
      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Tarification (commission 3%)</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Net = ce que vous touchez | Public = prix affiché au client
          </p>
        </div>

        {/* En-tetes des colonnes */}
        <div className="flex items-center gap-3 px-3 text-xs text-muted-foreground">
          <div className="w-14 shrink-0"></div>
          <div className="flex-1">Prix net (FCFA)</div>
          <div className="w-4 shrink-0"></div>
          <div className="flex-1">Prix public (FCFA)</div>
        </div>

        <div className="space-y-2">
          <PricingRow
            label="1h"
            required
            netValue={netPrice1h}
            publicValue={publicPrice1h}
            onNetChange={(v) => handleNetChange(v, setNetPrice1h, setPublicPrice1h, 'price_per_hour')}
            onPublicChange={(v) => handlePublicChange(v, setNetPrice1h, setPublicPrice1h, 'price_per_hour')}
            placeholder="Ex: 35000"
          />

          <PricingRow
            label="1h30"
            required
            netValue={netPrice1h30}
            publicValue={publicPrice1h30}
            onNetChange={(v) => handleNetChange(v, setNetPrice1h30, setPublicPrice1h30, 'price_1h30')}
            onPublicChange={(v) => handlePublicChange(v, setNetPrice1h30, setPublicPrice1h30, 'price_1h30')}
            placeholder="Ex: 50000"
          />

          <PricingRow
            label="2h"
            required
            netValue={netPrice2h}
            publicValue={publicPrice2h}
            onNetChange={(v) => handleNetChange(v, setNetPrice2h, setPublicPrice2h, 'price_2h')}
            onPublicChange={(v) => handlePublicChange(v, setNetPrice2h, setPublicPrice2h, 'price_2h')}
            placeholder="Ex: 60000"
          />
        </div>

        <p className="text-xs text-muted-foreground">
          Le prix public inclut ~3% de commission (payée par le client). Arrondi commercial automatique.
        </p>
      </div>

      <Separator />

      {/* Section Horaires */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-900">Horaires d'ouverture</h3>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="availability_start">Ouverture</Label>
            <Input
              id="availability_start"
              type="time"
              value={formData.availability_start}
              onChange={(e) => onInputChange('availability_start', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="availability_end">Fermeture</Label>
            <Input
              id="availability_end"
              type="time"
              value={formData.availability_end}
              onChange={(e) => onInputChange('availability_end', e.target.value)}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default FieldStepTarifs;
