import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import StepType from './StepType';
import StepValue from './StepValue';
import StepTargeting from './StepTargeting';
import StepFinalize from './StepFinalize';
import { PromoWizardData } from '@/hooks/usePromoCreation';

interface Field {
  id: string;
  name: string;
  location?: string;
  net_price_1h?: number | null;
  net_price_1h30?: number | null;
  net_price_2h?: number | null;
  price_per_hour?: number;
}

interface PromoWizardProps {
  isOpen: boolean;
  step: number;
  wizardData: PromoWizardData;
  fields: Field[];
  isCreating: boolean;
  onClose: () => void;
  onPrevStep: () => void;
  onNextStep: () => void;
  onUpdateData: (updates: Partial<PromoWizardData>) => void;
  onGenerateCode: () => void;
  onCreate: () => void;
}

const STEP_TITLES = ['Type', 'Valeur', 'Ciblage', 'Finaliser'];

const PromoWizard: React.FC<PromoWizardProps> = ({
  isOpen,
  step,
  wizardData,
  fields,
  isCreating,
  onClose,
  onPrevStep,
  onNextStep,
  onUpdateData,
  onGenerateCode,
  onCreate
}) => {
  const progress = (step / 4) * 100;

  const canProceed = () => {
    switch (step) {
      case 1:
        return true; // Type is always selected
      case 2:
        return wizardData.discountValue > 0;
      case 3:
        return (
          (wizardData.allFields || wizardData.selectedFieldIds.length > 0) &&
          (wizardData.allSlots || wizardData.selectedSlots.length > 0)
        );
      case 4:
        return (
          wizardData.name.trim() !== '' &&
          (wizardData.promoType === 'automatic' || wizardData.code.trim() !== '')
        );
      default:
        return false;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Créer une promotion</DialogTitle>
        </DialogHeader>

        {/* Progress */}
        <div className="space-y-2 mb-6">
          <div className="flex justify-between text-sm text-muted-foreground">
            {STEP_TITLES.map((title, i) => (
              <span
                key={title}
                className={step === i + 1 ? 'text-primary font-medium' : ''}
              >
                {title}
              </span>
            ))}
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Step content */}
        <div className="py-4">
          {step === 1 && (
            <StepType
              promoType={wizardData.promoType}
              onTypeChange={(type) => onUpdateData({ promoType: type })}
            />
          )}
          {step === 2 && (
            <StepValue
              discountType={wizardData.discountType}
              discountValue={wizardData.discountValue}
              onDiscountTypeChange={(type) => onUpdateData({ discountType: type })}
              onDiscountValueChange={(value) => onUpdateData({ discountValue: value })}
              fields={fields}
              selectedFieldIds={wizardData.selectedFieldIds}
              allFields={wizardData.allFields}
            />
          )}
          {step === 3 && (
            <StepTargeting
              fields={fields}
              allFields={wizardData.allFields}
              selectedFieldIds={wizardData.selectedFieldIds}
              allSlots={wizardData.allSlots}
              selectedSlots={wizardData.selectedSlots}
              onAllFieldsChange={(val) => onUpdateData({ allFields: val })}
              onFieldsChange={(ids) => onUpdateData({ selectedFieldIds: ids })}
              onAllSlotsChange={(val) => onUpdateData({ allSlots: val })}
              onSlotsChange={(slots) => onUpdateData({ selectedSlots: slots })}
            />
          )}
          {step === 4 && (
            <StepFinalize
              wizardData={wizardData}
              fields={fields}
              onNameChange={(name) => onUpdateData({ name })}
              onCodeChange={(code) => onUpdateData({ code })}
              onGenerateCode={onGenerateCode}
              onUsageLimitTotalChange={(limit) => onUpdateData({ usageLimitTotal: limit })}
              onUsageLimitPerUserChange={(limit) => onUpdateData({ usageLimitPerUser: limit })}
              onEndDateChange={(date) => onUpdateData({ endDate: date })}
            />
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={step === 1 ? onClose : onPrevStep}
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            {step === 1 ? 'Annuler' : 'Précédent'}
          </Button>

          {step < 4 ? (
            <Button onClick={onNextStep} disabled={!canProceed()}>
              Suivant
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={onCreate}
              disabled={!canProceed() || isCreating}
              className="bg-green-600 hover:bg-green-700"
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Création...
                </>
              ) : (
                'Créer la promotion'
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PromoWizard;
