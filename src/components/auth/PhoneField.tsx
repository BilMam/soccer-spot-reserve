import { useState, useEffect } from 'react';
import PhoneInput from 'react-phone-number-input';
import type { Country } from 'react-phone-number-input';
import { isValidPhoneNumber } from '@/lib/phone';

const ALLOWED_COUNTRIES: Country[] = [
  'CI', 'SN', 'ML', 'BF', 'GH', 'NG', 'CM', 'TG', 'BJ', 'FR', 'GB', 'US', 'CA'
];

interface PhoneFieldProps {
  valueE164: string | undefined;
  onChangeE164: (value: string | undefined) => void;
  defaultCountry?: Country;
  placeholder?: string;
  disabled?: boolean;
}

export function PhoneField({ 
  valueE164, 
  onChangeE164, 
  defaultCountry = 'CI',
  placeholder,
  disabled = false
}: PhoneFieldProps) {
  const [selectedCountry, setSelectedCountry] = useState<Country>(defaultCountry);
  const [error, setError] = useState<string | null>(null);

  // Load last used country from localStorage
  useEffect(() => {
    const lastCountry = localStorage.getItem('lastPhoneCountry') as Country;
    if (lastCountry && ALLOWED_COUNTRIES.includes(lastCountry)) {
      setSelectedCountry(lastCountry);
    }
  }, []);

  const handleChange = (value: string | undefined) => {
    onChangeE164(value);
    
    // Validate and show error if invalid
    if (value) {
      const valid = isValidPhoneNumber(value);
      if (!valid) {
        setError('Numéro invalide pour le pays sélectionné');
      } else {
        setError(null);
        // Save country preference
        const country = value.startsWith('+') ? undefined : selectedCountry;
        if (country) {
          localStorage.setItem('lastPhoneCountry', country);
        }
      }
    } else {
      setError(null);
    }
  };

  return (
    <div className="space-y-2">
      <div className="relative">
        <PhoneInput
          international
          defaultCountry={selectedCountry}
          countries={ALLOWED_COUNTRIES}
          value={valueE164}
          onChange={handleChange}
          onCountryChange={(country) => {
            if (country) {
              setSelectedCountry(country);
              localStorage.setItem('lastPhoneCountry', country);
            }
          }}
          placeholder={placeholder || "Entrez votre numéro"}
          disabled={disabled}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>
      
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
      
      <p className="text-xs text-muted-foreground">
        Ex: +225 07 12 34 56 — changez le pays si besoin
      </p>
    </div>
  );
}
