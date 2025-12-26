import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Ticket, Zap, MoreVertical, Pause, Play, Trash2, Copy, Eye, MapPin, Clock } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { PromoCodeWithDetails } from '@/hooks/usePromoCodes';
import { formatXOF } from '@/utils/publicPricing';
import { format, isPast, addDays, isWithinInterval } from 'date-fns';
import { fr } from 'date-fns/locale';
import PromoDetailsModal from './PromoDetailsModal';

interface PromoCardProps {
  promo: PromoCodeWithDetails;
  onToggleStatus: (promoId: string, newStatus: 'active' | 'paused') => void;
  onDelete: (promoId: string) => void;
}

const dayNamesShort = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];

const PromoCard: React.FC<PromoCardProps> = ({ promo, onToggleStatus, onDelete }) => {
  const [showDetails, setShowDetails] = useState(false);
  
  const usagePercent = promo.usage_limit_total 
    ? (promo.times_used / promo.usage_limit_total) * 100 
    : 0;
  
  const isExpiringSoon = promo.end_date && isWithinInterval(new Date(promo.end_date), {
    start: new Date(),
    end: addDays(new Date(), 7)
  });

  const isExpired = promo.end_date && isPast(new Date(promo.end_date));

  // Résumé des terrains ciblés
  const fieldsCount = promo.promo_fields?.length || 0;
  const fieldNames = promo.promo_fields?.slice(0, 2).map(pf => pf.fields?.name).filter(Boolean) || [];
  
  // Résumé des créneaux ciblés
  const slotsCount = promo.promo_time_slots?.length || 0;

  return (
    <>
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-5">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${promo.is_automatic ? 'bg-purple-100' : 'bg-orange-100'}`}>
                {promo.is_automatic ? (
                  <Zap className="w-5 h-5 text-purple-600" />
                ) : (
                  <Ticket className="w-5 h-5 text-orange-600" />
                )}
              </div>
              <div>
                <h4 className="font-semibold">{promo.name}</h4>
                {promo.code && (
                  <code className="text-sm bg-muted px-2 py-0.5 rounded">{promo.code}</code>
                )}
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setShowDetails(true)}>
                  <Eye className="w-4 h-4 mr-2" /> Voir détails
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onToggleStatus(promo.id, promo.status === 'active' ? 'paused' : 'active')}>
                  {promo.status === 'active' ? (
                    <><Pause className="w-4 h-4 mr-2" /> Mettre en pause</>
                  ) : (
                    <><Play className="w-4 h-4 mr-2" /> Réactiver</>
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigator.clipboard.writeText(promo.code || '')}>
                  <Copy className="w-4 h-4 mr-2" /> Copier le code
                </DropdownMenuItem>
                <DropdownMenuItem className="text-destructive" onClick={() => onDelete(promo.id)}>
                  <Trash2 className="w-4 h-4 mr-2" /> Supprimer
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Badges */}
          <div className="flex flex-wrap gap-2 mb-4">
            <Badge variant={promo.status === 'active' ? 'default' : 'secondary'} className={promo.status === 'active' ? 'bg-green-600' : ''}>
              {promo.discount_type === 'percent' ? `-${promo.discount_value}%` : `-${formatXOF(promo.discount_value)}`}
            </Badge>
            {isExpiringSoon && !isExpired && (
              <Badge variant="outline" className="border-orange-300 text-orange-600">Expire bientôt</Badge>
            )}
            {isExpired && (
              <Badge variant="outline" className="border-red-300 text-red-600">Expiré</Badge>
            )}
            {promo.status === 'paused' && (
              <Badge variant="outline">En pause</Badge>
            )}
          </div>

          {/* Résumé des ciblages */}
          <div className="flex flex-wrap gap-2 mb-3 text-xs text-muted-foreground">
            {fieldsCount > 0 && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {fieldNames.join(', ')}{fieldsCount > 2 && ` +${fieldsCount - 2}`}
              </span>
            )}
            {slotsCount > 0 && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {slotsCount} créneau{slotsCount > 1 ? 'x' : ''} ciblé{slotsCount > 1 ? 's' : ''}
              </span>
            )}
            {fieldsCount === 0 && slotsCount === 0 && (
              <span>Tous terrains, tous créneaux</span>
            )}
          </div>

          {/* Usage */}
          {promo.usage_limit_total && (
            <div className="mb-3">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">Utilisations</span>
                <span>{promo.times_used} / {promo.usage_limit_total}</span>
              </div>
              <Progress value={usagePercent} className="h-2" />
            </div>
          )}

          {/* Stats */}
          <div className="flex justify-between text-sm text-muted-foreground pt-2 border-t">
            <span>{promo.times_used} utilisation{promo.times_used > 1 ? 's' : ''}</span>
            {promo.end_date && (
              <span>Expire {format(new Date(promo.end_date), 'dd MMM', { locale: fr })}</span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Modal détails */}
      <PromoDetailsModal 
        promo={promo} 
        isOpen={showDetails} 
        onClose={() => setShowDetails(false)} 
      />
    </>
  );
};

export default PromoCard;
