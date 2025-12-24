import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Percent, Banknote } from 'lucide-react';
import PromoPreview from './PromoPreview';

interface FieldWithPricing {
  id: string;
  name: string;
  net_price_1h?: number | null;
  net_price_1h30?: number | null;
  net_price_2h?: number | null;
  price_per_hour?: number;
}

interface StepValueProps {
  discountType: 'percent' | 'fixed';
  discountValue: number;
  onDiscountTypeChange: (type: 'percent' | 'fixed') => void;
  onDiscountValueChange: (value: number) => void;
  // Props pour l'aperçu
  fields?: FieldWithPricing[];
  selectedFieldIds?: string[];
  allFields?: boolean;
}

const QUICK_PERCENTS = [10, 15, 20, 25];
const QUICK_AMOUNTS = [1000, 2000, 3000, 5000];

const StepValue: React.FC<StepValueProps> = ({
  discountType,
  discountValue,
  onDiscountTypeChange,
  onDiscountValueChange,
  fields = [],
  selectedFieldIds = [],
  allFields = true
}) => {
  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h3 className="text-xl font-semibold mb-2">Valeur de la réduction</h3>
        <p className="text-muted-foreground">
          Définissez le montant de la réduction
        </p>
      </div>

      {/* Type toggle */}
      <div className="flex justify-center gap-2 p-1 bg-muted rounded-lg w-fit mx-auto">
        <button
          type="button"
          onClick={() => onDiscountTypeChange('percent')}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-md transition-all",
            discountType === 'percent'
              ? "bg-background shadow text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Percent className="w-4 h-4" />
          Pourcentage
        </button>
        <button
          type="button"
          onClick={() => onDiscountTypeChange('fixed')}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-md transition-all",
            discountType === 'fixed'
              ? "bg-background shadow text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Banknote className="w-4 h-4" />
          Montant fixe
        </button>
      </div>

      {/* Quick select buttons */}
      <div className="flex justify-center gap-3">
        {(discountType === 'percent' ? QUICK_PERCENTS : QUICK_AMOUNTS).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => onDiscountValueChange(value)}
            className={cn(
              "px-4 py-2 rounded-lg border transition-all",
              discountValue === value
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border hover:border-primary/50 hover:bg-muted"
            )}
          >
            {discountType === 'percent' ? `${value}%` : `${value.toLocaleString()} XOF`}
          </button>
        ))}
      </div>

      {/* Custom input */}
      <div className="max-w-xs mx-auto">
        <Label htmlFor="discount-value" className="text-center block mb-2">
          Ou saisissez une valeur personnalisée
        </Label>
        <div className="relative">
          <Input
            id="discount-value"
            type="number"
            min={1}
            max={discountType === 'percent' ? 100 : 100000}
            value={discountValue}
            onChange={(e) => onDiscountValueChange(Number(e.target.value))}
            className="text-center text-lg pr-12"
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">
            {discountType === 'percent' ? '%' : 'XOF'}
          </span>
        </div>
      </div>

      {/* Preview */}
      <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
        <p className="text-green-700 dark:text-green-400 font-medium">
          {discountType === 'percent'
            ? `Les clients bénéficieront de ${discountValue}% de réduction`
            : `Les clients économiseront ${discountValue.toLocaleString()} XOF`}
        </p>
      </div>

      {/* Aperçu des montants */}
      {fields.length > 0 && (
        <PromoPreview
          fields={fields}
          selectedFieldIds={selectedFieldIds}
          allFields={allFields}
          discountType={discountType}
          discountValue={discountValue}
        />
      )}
    </div>
  );
};

export default StepValue;
