import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Tag, X, Check, AlertCircle } from 'lucide-react';
import { AppliedPromo } from '@/hooks/usePromoValidation';
import { formatXOF } from '@/utils/publicPricing';

interface PromoCodeInputProps {
  appliedPromo: AppliedPromo | null;
  validationError: string | null;
  isValidating: boolean;
  onValidate: (code: string) => void;
  onClear: () => void;
}

const PromoCodeInput: React.FC<PromoCodeInputProps> = ({
  appliedPromo,
  validationError,
  isValidating,
  onValidate,
  onClear
}) => {
  const [inputCode, setInputCode] = useState('');

  const handleApply = () => {
    if (inputCode.trim()) {
      onValidate(inputCode.trim().toUpperCase());
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleApply();
    }
  };

  const handleClear = () => {
    setInputCode('');
    onClear();
  };

  // Si une promo est appliquée, afficher le badge de succès
  if (appliedPromo) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-green-600" />
            <span className="text-sm font-medium text-green-700">
              Code appliqué : {appliedPromo.name}
            </span>
            <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs">
              {appliedPromo.discountType === 'percent'
                ? `-${appliedPromo.discountValue}%`
                : `-${formatXOF(appliedPromo.discountValue)}`}
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="h-7 px-2 text-green-700 hover:text-green-800 hover:bg-green-100"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Entrer un code promo"
            value={inputCode}
            onChange={(e) => setInputCode(e.target.value.toUpperCase())}
            onKeyPress={handleKeyPress}
            className="pl-10 uppercase"
            disabled={isValidating}
          />
        </div>
        <Button
          variant="outline"
          onClick={handleApply}
          disabled={!inputCode.trim() || isValidating}
          className="shrink-0"
        >
          {isValidating ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            'Appliquer'
          )}
        </Button>
      </div>

      {validationError && (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="w-4 h-4" />
          <span>{validationError}</span>
        </div>
      )}
    </div>
  );
};

export default PromoCodeInput;
