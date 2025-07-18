import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface PhoneInputCIProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  label?: string;
  error?: string;
  id?: string;
}

export function PhoneInputCI({
  value,
  onChange,
  placeholder = "01 02 03 04 05",
  disabled = false,
  required = false,
  className,
  label,
  error,
  id
}: PhoneInputCIProps) {
  // Extract the 10 digits from the value (remove 225 prefix and formatting)
  const formatDisplayValue = (rawValue: string) => {
    // Remove any non-digits and the 225 prefix
    const digits = rawValue.replace(/^(\+?225)?/, '').replace(/[^0-9]/g, '');
    
    // Format as XX XX XX XX XX for display (no padding)
    return digits
      .slice(0, 10)
      .replace(/(\d{2})(?=(\d{2})+(?!\d))/g, '$1 ')
      .trim();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    // Remove any non-digits
    const digits = inputValue.replace(/[^0-9]/g, '');
    
    // Limit to 10 digits
    if (digits.length <= 10) {
      // Return the normalized value with 225 prefix for storage (no padding)
      const normalizedValue = digits ? `225${digits}` : '';
      onChange(normalizedValue);
    }
  };

  const displayValue = formatDisplayValue(value);

  return (
    <div className="space-y-2">
      {label && (
        <Label htmlFor={id} className={required ? "after:content-['*'] after:ml-0.5 after:text-red-500" : ""}>
          {label}
        </Label>
      )}
      <div className="relative">
        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-sm font-medium text-muted-foreground bg-muted px-2 py-1 rounded border-r">
          +225
        </div>
        <Input
          id={id}
          type="tel"
          value={displayValue}
          onChange={handleInputChange}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          className={cn("pl-20", className, error && "border-red-500")}
        />
      </div>
      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}
      <p className="text-xs text-muted-foreground">
        Format ivoirien - 10 chiffres (compatible Wave, Orange Money, MTN, Moov)
      </p>
    </div>
  );
}