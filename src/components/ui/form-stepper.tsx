import React from 'react';
import { Check, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';

interface FormStepperProps {
  steps: { label: string; icon: LucideIcon }[];
  currentStep: number; // 0-indexed
  className?: string;
}

const FormStepper: React.FC<FormStepperProps> = ({ steps, currentStep, className }) => {
  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className={cn('w-full space-y-4', className)}>
      <div className="flex items-center">
        {steps.map((step, index) => {
          const isCompleted = index < currentStep;
          const isActive = index === currentStep;
          const Icon = step.icon;

          return (
            <React.Fragment key={step.label}>
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={cn(
                    'flex items-center justify-center w-9 h-9 rounded-full text-sm font-medium transition-colors',
                    isCompleted && 'bg-green-600 text-white',
                    isActive && 'bg-primary text-primary-foreground',
                    !isCompleted && !isActive && 'bg-muted text-muted-foreground'
                  )}
                >
                  {isCompleted ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Icon className="w-4 h-4" />
                  )}
                </div>
                <span
                  className={cn(
                    'text-xs whitespace-nowrap',
                    isActive && 'text-primary font-medium',
                    isCompleted && 'text-green-600 font-medium',
                    !isCompleted && !isActive && 'text-muted-foreground'
                  )}
                >
                  {step.label}
                </span>
              </div>

              {index < steps.length - 1 && (
                <div
                  className={cn(
                    'flex-1 h-0.5 mx-2 mb-5 transition-colors',
                    index < currentStep ? 'bg-green-600' : 'bg-muted'
                  )}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>

      <Progress value={progress} className="h-1.5" />
    </div>
  );
};

export { FormStepper };
