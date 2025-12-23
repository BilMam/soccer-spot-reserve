import React from 'react';
import { Ticket, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StepTypeProps {
  promoType: 'code' | 'automatic';
  onTypeChange: (type: 'code' | 'automatic') => void;
}

const StepType: React.FC<StepTypeProps> = ({ promoType, onTypeChange }) => {
  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h3 className="text-xl font-semibold mb-2">Type de promotion</h3>
        <p className="text-muted-foreground">
          Choisissez comment vos clients utiliseront cette promotion
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          type="button"
          onClick={() => onTypeChange('code')}
          className={cn(
            "p-6 rounded-xl border-2 text-left transition-all hover:border-primary/50",
            promoType === 'code'
              ? "border-primary bg-primary/5"
              : "border-border hover:bg-muted/50"
          )}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className={cn(
              "p-3 rounded-lg",
              promoType === 'code' ? "bg-primary text-primary-foreground" : "bg-muted"
            )}>
              <Ticket className="w-6 h-6" />
            </div>
            <span className="font-semibold text-lg">Code promo</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Le client saisit un code lors de la réservation pour bénéficier de la réduction.
            Idéal pour les campagnes marketing ciblées.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="text-xs bg-muted px-2 py-1 rounded">PROMO20</span>
            <span className="text-xs bg-muted px-2 py-1 rounded">WEEKEND15</span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onTypeChange('automatic')}
          className={cn(
            "p-6 rounded-xl border-2 text-left transition-all hover:border-primary/50",
            promoType === 'automatic'
              ? "border-primary bg-primary/5"
              : "border-border hover:bg-muted/50"
          )}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className={cn(
              "p-3 rounded-lg",
              promoType === 'automatic' ? "bg-primary text-primary-foreground" : "bg-muted"
            )}>
              <Zap className="w-6 h-6" />
            </div>
            <span className="font-semibold text-lg">Promo automatique</span>
          </div>
          <p className="text-sm text-muted-foreground">
            La réduction est appliquée automatiquement pour les créneaux ciblés.
            Idéal pour remplir les créneaux peu demandés.
          </p>
          <div className="mt-4">
            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
              -15% appliqué automatiquement
            </span>
          </div>
        </button>
      </div>
    </div>
  );
};

export default StepType;
