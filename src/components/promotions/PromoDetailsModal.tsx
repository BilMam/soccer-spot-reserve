import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Zap, Ticket, MapPin, Clock, Calendar, Users, Tag } from 'lucide-react';
import { PromoCodeWithDetails } from '@/hooks/usePromoCodes';
import { formatXOF, calculatePublicPrice } from '@/utils/publicPricing';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import PromoChip from './PromoChip';

interface PromoDetailsModalProps {
  promo: PromoCodeWithDetails | null;
  isOpen: boolean;
  onClose: () => void;
}

const dayNames = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

const PromoDetailsModal: React.FC<PromoDetailsModalProps> = ({ promo, isOpen, onClose }) => {
  if (!promo) return null;

  const usagePercent = promo.usage_limit_total 
    ? (promo.times_used / promo.usage_limit_total) * 100 
    : 0;

  const discountLabel = promo.discount_type === 'percent' 
    ? `-${promo.discount_value}%` 
    : `-${formatXOF(promo.discount_value)}`;

  // Calculate example prices (using 10000 as base net price for demo)
  const exampleNetPrice = 10000;
  const examplePublicPrice = calculatePublicPrice(exampleNetPrice);
  
  const calculateDiscountedPrice = (price: number) => {
    if (promo.discount_type === 'percent') {
      return Math.round(price * (1 - promo.discount_value / 100));
    }
    return Math.max(0, price - promo.discount_value);
  };

  const discountedPublic = calculateDiscountedPrice(examplePublicPrice);
  const discountedNet = calculateDiscountedPrice(exampleNetPrice);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {promo.is_automatic ? (
              <Zap className="w-5 h-5 text-purple-600" />
            ) : (
              <Ticket className="w-5 h-5 text-orange-600" />
            )}
            <span>Détails de la promotion</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Header Info */}
          <div className="space-y-2">
            <h3 className="text-xl font-bold">{promo.name}</h3>
            {promo.code && (
              <code className="text-lg bg-muted px-3 py-1 rounded font-mono">{promo.code}</code>
            )}
            <div className="flex items-center gap-2 mt-2">
              <Badge 
                variant={promo.is_automatic ? 'secondary' : 'outline'}
                className={promo.is_automatic ? 'bg-purple-100 text-purple-700' : 'bg-orange-100 text-orange-700'}
              >
                {promo.is_automatic ? 'Automatique' : 'Code promo'}
              </Badge>
              <Badge variant="default" className="bg-green-600">
                {discountLabel}
              </Badge>
            </div>
          </div>

          <Separator />

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Type</p>
              <p className="font-medium">{promo.is_automatic ? 'Promo automatique' : 'Code à saisir'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Valeur</p>
              <p className="font-medium">
                {promo.discount_type === 'percent' 
                  ? `${promo.discount_value}% de réduction`
                  : `${formatXOF(promo.discount_value)} de réduction`
                }
              </p>
            </div>
            <div>
              <p className="text-muted-foreground flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" /> Validité
              </p>
              <p className="font-medium">
                {format(new Date(promo.start_date), 'dd MMM yyyy', { locale: fr })}
                {promo.end_date && (
                  <> → {format(new Date(promo.end_date), 'dd MMM yyyy', { locale: fr })}</>
                )}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground flex items-center gap-1">
                <Users className="w-3.5 h-3.5" /> Limites
              </p>
              <p className="font-medium">
                {promo.usage_limit_total ? `${promo.usage_limit_total} total` : 'Illimité'}
                {promo.usage_limit_per_user && `, ${promo.usage_limit_per_user}/client`}
              </p>
            </div>
          </div>

          {/* Usage Progress */}
          {promo.usage_limit_total && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Utilisations</span>
                <span className="font-medium">{promo.times_used} / {promo.usage_limit_total}</span>
              </div>
              <Progress value={usagePercent} className="h-2" />
            </div>
          )}

          <Separator />

          {/* Targeted Fields */}
          <div className="space-y-3">
            <h4 className="font-semibold flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Terrains ciblés ({promo.promo_fields?.length || 0})
            </h4>
            {promo.promo_fields && promo.promo_fields.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {promo.promo_fields.map((pf, index) => (
                  <Badge key={index} variant="outline" className="px-3 py-1">
                    {pf.fields?.name || 'Terrain inconnu'}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Tous les terrains</p>
            )}
          </div>

          {/* Targeted Time Slots */}
          <div className="space-y-3">
            <h4 className="font-semibold flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Créneaux ciblés ({promo.promo_time_slots?.length || 0})
            </h4>
            {promo.promo_time_slots && promo.promo_time_slots.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {promo.promo_time_slots.map((slot, index) => (
                  <PromoChip
                    key={index}
                    discountType={promo.discount_type}
                    discountValue={promo.discount_value}
                    dayOfWeek={slot.day_of_week}
                    startTime={slot.start_time}
                    endTime={slot.end_time}
                    isAutomatic={promo.is_automatic}
                    size="sm"
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Tous les créneaux</p>
            )}
          </div>

          <Separator />

          {/* Price Preview */}
          <div className="space-y-3">
            <h4 className="font-semibold flex items-center gap-2">
              <Tag className="w-4 h-4" />
              Aperçu des montants (exemple 1h)
            </h4>
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div></div>
                <div className="text-center font-medium text-muted-foreground">Avant</div>
                <div className="text-center font-medium text-green-600">Après</div>
                
                <div className="text-muted-foreground">Net propriétaire</div>
                <div className="text-center">{formatXOF(exampleNetPrice)}</div>
                <div className="text-center font-medium text-green-600">{formatXOF(discountedNet)}</div>
                
                <div className="text-muted-foreground">Prix public</div>
                <div className="text-center">{formatXOF(examplePublicPrice)}</div>
                <div className="text-center font-medium text-green-600">{formatXOF(discountedPublic)}</div>
              </div>
            </div>
          </div>

          {/* Close Button */}
          <div className="flex justify-end pt-2">
            <Button variant="outline" onClick={onClose}>
              Fermer
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PromoDetailsModal;
