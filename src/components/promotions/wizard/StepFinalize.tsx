import React, { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarIcon, RefreshCw, Check, MapPin, Clock, Percent, Banknote, TrendingDown, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { PromoWizardData } from '@/hooks/usePromoCreation';
import { calculatePromoImpact, getNetPriceForDuration } from '@/utils/promoCalculations';
import { formatXOF } from '@/utils/publicPricing';

interface Field {
  id: string;
  name: string;
  net_price_1h?: number | null;
  net_price_1h30?: number | null;
  net_price_2h?: number | null;
  price_per_hour?: number;
}

interface StepFinalizeProps {
  wizardData: PromoWizardData;
  fields: Field[];
  onNameChange: (name: string) => void;
  onCodeChange: (code: string) => void;
  onGenerateCode: () => void;
  onUsageLimitTotalChange: (limit: number | null) => void;
  onUsageLimitPerUserChange: (limit: number) => void;
  onEndDateChange: (date: Date | null) => void;
}

const DAYS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

const StepFinalize: React.FC<StepFinalizeProps> = ({
  wizardData,
  fields,
  onNameChange,
  onCodeChange,
  onGenerateCode,
  onUsageLimitTotalChange,
  onUsageLimitPerUserChange,
  onEndDateChange
}) => {
  const [selectedDuration, setSelectedDuration] = useState<'1h' | '1h30' | '2h'>('1h');
  const [previewFieldId, setPreviewFieldId] = useState<string>('');

  const selectedFields = fields.filter(f => wizardData.selectedFieldIds.includes(f.id));
  
  // Terrains disponibles pour l'aperçu
  const availableFieldsForPreview = useMemo(() => {
    if (wizardData.allFields) return fields;
    return selectedFields;
  }, [wizardData.allFields, fields, selectedFields]);

  // Sélectionner le premier terrain par défaut
  const previewField = useMemo(() => {
    if (previewFieldId) {
      return availableFieldsForPreview.find(f => f.id === previewFieldId);
    }
    return availableFieldsForPreview[0];
  }, [previewFieldId, availableFieldsForPreview]);

  // Calculer l'impact de la promo
  const impact = useMemo(() => {
    if (!previewField || wizardData.discountValue <= 0) return null;
    
    const netPrice = getNetPriceForDuration(previewField, selectedDuration);
    if (!netPrice) return null;

    return calculatePromoImpact(
      netPrice,
      wizardData.discountType,
      wizardData.discountValue
    );
  }, [previewField, selectedDuration, wizardData.discountType, wizardData.discountValue]);

  const formatSlot = (slot: { dayOfWeek: number | null; startTime: string; endTime: string }) => {
    const dayStr = slot.dayOfWeek !== null ? DAYS[slot.dayOfWeek] : 'Tous';
    return `${dayStr} ${slot.startTime}-${slot.endTime}`;
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h3 className="text-xl font-semibold mb-2">Finaliser</h3>
        <p className="text-muted-foreground">
          Derniers détails avant de créer votre promotion
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left column - Form */}
        <div className="space-y-4">
          <div>
            <Label htmlFor="promo-name">Nom de la promotion *</Label>
            <Input
              id="promo-name"
              placeholder="Ex: Offre de lancement"
              value={wizardData.name}
              onChange={(e) => onNameChange(e.target.value)}
              className="mt-1"
            />
          </div>

          {wizardData.promoType === 'code' && (
            <div>
              <Label htmlFor="promo-code">Code promo *</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id="promo-code"
                  placeholder="PROMO20"
                  value={wizardData.code}
                  onChange={(e) => onCodeChange(e.target.value.toUpperCase())}
                  className="uppercase"
                />
                <Button type="button" variant="outline" onClick={onGenerateCode}>
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Le code sera en majuscules, sans espaces
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="usage-limit">Limite totale d'utilisation</Label>
              <Input
                id="usage-limit"
                type="number"
                min={0}
                placeholder="Illimité"
                value={wizardData.usageLimitTotal || ''}
                onChange={(e) => onUsageLimitTotalChange(e.target.value ? Number(e.target.value) : null)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="usage-per-user">Par utilisateur</Label>
              <Input
                id="usage-per-user"
                type="number"
                min={1}
                value={wizardData.usageLimitPerUser}
                onChange={(e) => onUsageLimitPerUserChange(Number(e.target.value) || 1)}
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <Label>Date d'expiration (optionnel)</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal mt-1",
                    !wizardData.endDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {wizardData.endDate ? (
                    format(wizardData.endDate, 'PPP', { locale: fr })
                  ) : (
                    "Pas de date limite"
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={wizardData.endDate || undefined}
                  onSelect={(date) => onEndDateChange(date || null)}
                  disabled={(date) => date < new Date()}
                  initialFocus
                />
                {wizardData.endDate && (
                  <div className="p-2 border-t">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full"
                      onClick={() => onEndDateChange(null)}
                    >
                      Supprimer la date limite
                    </Button>
                  </div>
                )}
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Right column - Summary + Preview */}
        <div className="space-y-4">
          {/* Résumé de la promotion */}
          <div className="bg-muted/50 rounded-xl p-5 space-y-4">
            <h4 className="font-semibold flex items-center gap-2">
              <Check className="w-5 h-5 text-green-600" />
              Résumé de la promotion
            </h4>

            <div className="space-y-3 text-sm">
              {/* Discount */}
              <div className="flex items-center gap-2">
                {wizardData.discountType === 'percent' ? (
                  <Percent className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <Banknote className="w-4 h-4 text-muted-foreground" />
                )}
                <span className="text-muted-foreground">Réduction:</span>
                <Badge variant="secondary" className="bg-green-100 text-green-700">
                  {wizardData.discountType === 'percent'
                    ? `-${wizardData.discountValue}%`
                    : `-${wizardData.discountValue.toLocaleString()} XOF`}
                </Badge>
              </div>

              {/* Fields */}
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                <span className="text-muted-foreground">Terrains:</span>
                <div className="flex-1">
                  {wizardData.allFields ? (
                    <span>Tous les terrains</span>
                  ) : selectedFields.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {selectedFields.map(f => (
                        <Badge key={f.id} variant="outline" className="text-xs">
                          {f.name}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <span className="text-orange-600">Aucun terrain sélectionné</span>
                  )}
                </div>
              </div>

              {/* Slots */}
              <div className="flex items-start gap-2">
                <Clock className="w-4 h-4 text-muted-foreground mt-0.5" />
                <span className="text-muted-foreground">Créneaux:</span>
                <div className="flex-1">
                  {wizardData.allSlots ? (
                    <span>Tous les créneaux</span>
                  ) : wizardData.selectedSlots.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {wizardData.selectedSlots.map((slot, i) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {formatSlot(slot)}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <span className="text-orange-600">Aucun créneau sélectionné</span>
                  )}
                </div>
              </div>

              {/* Type */}
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Type:</span>
                <Badge variant={wizardData.promoType === 'code' ? 'default' : 'secondary'}>
                  {wizardData.promoType === 'code' ? 'Code à saisir' : 'Automatique'}
                </Badge>
              </div>

              {/* Limits */}
              {(wizardData.usageLimitTotal || wizardData.endDate) && (
                <div className="pt-2 border-t space-y-1">
                  {wizardData.usageLimitTotal && (
                    <p className="text-xs text-muted-foreground">
                      Limité à {wizardData.usageLimitTotal} utilisations
                    </p>
                  )}
                  {wizardData.endDate && (
                    <p className="text-xs text-muted-foreground">
                      Expire le {format(wizardData.endDate, 'dd/MM/yyyy')}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Aperçu des montants */}
          {availableFieldsForPreview.length > 0 && wizardData.discountValue > 0 && (
            <div className="border rounded-xl p-4 space-y-4">
              <h4 className="font-semibold text-sm">Aperçu des montants</h4>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Terrain</Label>
                  <Select
                    value={previewFieldId || previewField?.id || ''}
                    onValueChange={setPreviewFieldId}
                  >
                    <SelectTrigger className="mt-1 h-8 text-xs">
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableFieldsForPreview.map(f => (
                        <SelectItem key={f.id} value={f.id} className="text-xs">
                          {f.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">Durée</Label>
                  <ToggleGroup
                    type="single"
                    value={selectedDuration}
                    onValueChange={(v) => v && setSelectedDuration(v as '1h' | '1h30' | '2h')}
                    className="mt-1 justify-start"
                  >
                    <ToggleGroupItem value="1h" size="sm" className="h-8 px-3 text-xs">1h</ToggleGroupItem>
                    <ToggleGroupItem value="1h30" size="sm" className="h-8 px-3 text-xs">1h30</ToggleGroupItem>
                    <ToggleGroupItem value="2h" size="sm" className="h-8 px-3 text-xs">2h</ToggleGroupItem>
                  </ToggleGroup>
                </div>
              </div>

              {impact && (
                <div className="text-xs">
                  <div className="grid grid-cols-4 gap-2 font-medium text-muted-foreground mb-2">
                    <div></div>
                    <div className="text-center">Avant</div>
                    <div className="text-center">Après</div>
                    <div className="text-center">Δ</div>
                  </div>

                  {/* Net propriétaire */}
                  <div className="grid grid-cols-4 gap-2 py-1.5 border-t">
                    <div className="font-medium">Net proprio</div>
                    <div className="text-center">{formatXOF(impact.ownerNetBefore)}</div>
                    <div className="text-center text-green-600 font-medium">
                      {formatXOF(impact.ownerNetAfter)}
                    </div>
                    <div className="text-center text-orange-600 flex items-center justify-center gap-1">
                      <TrendingDown className="w-3 h-3" />
                      {formatXOF(impact.ownerLoss)}
                    </div>
                  </div>

                  {/* Prix affiché */}
                  <div className="grid grid-cols-4 gap-2 py-1.5 border-t">
                    <div className="font-medium">Prix affiché</div>
                    <div className="text-center">{formatXOF(impact.publicPriceBefore)}</div>
                    <div className="text-center text-green-600 font-medium">
                      {formatXOF(impact.publicPriceAfter)}
                    </div>
                    <div className="text-center text-green-600 flex items-center justify-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      {formatXOF(impact.customerSavings)}
                    </div>
                  </div>

                  {/* Commission */}
                  <div className="grid grid-cols-4 gap-2 py-1.5 border-t">
                    <div className="font-medium">Commission</div>
                    <div className="text-center">{formatXOF(impact.commissionBefore)}</div>
                    <div className="text-center">{formatXOF(impact.commissionAfter)}</div>
                    <div className="text-center text-muted-foreground">
                      {impact.platformDelta > 0 ? `-${formatXOF(impact.platformDelta)}` : '0'}
                    </div>
                  </div>
                </div>
              )}

              <p className="text-xs text-muted-foreground bg-blue-50 p-2 rounded">
                Le prix affiché au client changera. Les frais opérateurs s'ajouteront au checkout. 
                Vous serez payé selon le net après promo.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StepFinalize;
