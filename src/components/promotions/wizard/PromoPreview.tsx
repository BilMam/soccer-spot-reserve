import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { TrendingDown, Info, Calculator } from 'lucide-react';
import { calculatePromoImpact, getNetPriceForDuration } from '@/utils/promoCalculations';
import { formatXOF } from '@/utils/publicPricing';

interface FieldWithPricing {
  id: string;
  name: string;
  net_price_1h?: number | null;
  net_price_1h30?: number | null;
  net_price_2h?: number | null;
  price_per_hour?: number;
}

interface PromoPreviewProps {
  fields: FieldWithPricing[];
  selectedFieldIds: string[];
  allFields: boolean;
  discountType: 'percent' | 'fixed';
  discountValue: number;
}

type Duration = '1h' | '1h30' | '2h';

const PromoPreview: React.FC<PromoPreviewProps> = ({
  fields,
  selectedFieldIds,
  allFields,
  discountType,
  discountValue
}) => {
  const [selectedDuration, setSelectedDuration] = useState<Duration>('1h');
  const [selectedFieldId, setSelectedFieldId] = useState<string>('');

  // Terrains disponibles pour l'aperçu
  const availableFields = useMemo(() => {
    if (allFields) return fields;
    return fields.filter(f => selectedFieldIds.includes(f.id));
  }, [fields, allFields, selectedFieldIds]);

  // Terrain sélectionné pour l'aperçu
  const previewField = useMemo(() => {
    if (selectedFieldId) {
      return availableFields.find(f => f.id === selectedFieldId);
    }
    return availableFields[0];
  }, [availableFields, selectedFieldId]);

  // Calcul de l'impact
  const impact = useMemo(() => {
    if (!previewField || discountValue <= 0) return null;
    
    const netPrice = getNetPriceForDuration(previewField, selectedDuration);
    if (!netPrice || netPrice <= 0) return null;
    
    return calculatePromoImpact(netPrice, discountType, discountValue);
  }, [previewField, selectedDuration, discountType, discountValue]);

  if (availableFields.length === 0) {
    return (
      <Card className="border-dashed border-muted-foreground/30">
        <CardContent className="py-6 text-center text-muted-foreground">
          <Calculator className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Sélectionnez un terrain pour voir l'aperçu des montants</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-background to-muted/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Calculator className="w-4 h-4" />
          Aperçu des montants
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Sélecteurs */}
        <div className="grid grid-cols-2 gap-3">
          {/* Terrain de référence */}
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Terrain</label>
            <Select
              value={selectedFieldId || previewField?.id}
              onValueChange={setSelectedFieldId}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Sélectionner" />
              </SelectTrigger>
              <SelectContent>
                {availableFields.map(field => (
                  <SelectItem key={field.id} value={field.id}>
                    {field.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Durée */}
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Durée</label>
            <ToggleGroup
              type="single"
              value={selectedDuration}
              onValueChange={(val) => val && setSelectedDuration(val as Duration)}
              className="justify-start"
            >
              <ToggleGroupItem value="1h" size="sm" className="text-xs px-3">1h</ToggleGroupItem>
              <ToggleGroupItem value="1h30" size="sm" className="text-xs px-3">1h30</ToggleGroupItem>
              <ToggleGroupItem value="2h" size="sm" className="text-xs px-3">2h</ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>

        {/* Tableau AVANT / APRÈS */}
        {impact ? (
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50">
                  <th className="text-left px-3 py-2 font-medium"></th>
                  <th className="text-right px-3 py-2 font-medium text-muted-foreground">Avant</th>
                  <th className="text-right px-3 py-2 font-medium text-green-600">Après promo</th>
                  <th className="text-right px-3 py-2 font-medium text-orange-600">Perte</th>
                </tr>
              </thead>
              <tbody>
                {/* Net propriétaire */}
                <tr className="border-t">
                  <td className="px-3 py-2 text-muted-foreground">Net propriétaire</td>
                  <td className="px-3 py-2 text-right">{formatXOF(impact.ownerNetBefore)}</td>
                  <td className="px-3 py-2 text-right bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 font-medium">
                    {formatXOF(impact.ownerNetAfter)}
                  </td>
                  <td className="px-3 py-2 text-right bg-orange-50 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400">
                    <span className="flex items-center justify-end gap-1">
                      <TrendingDown className="w-3 h-3" />
                      {formatXOF(impact.ownerLoss)}
                    </span>
                  </td>
                </tr>
                
                {/* Prix public */}
                <tr className="border-t">
                  <td className="px-3 py-2 text-muted-foreground">Prix affiché</td>
                  <td className="px-3 py-2 text-right">{formatXOF(impact.publicPriceBefore)}</td>
                  <td className="px-3 py-2 text-right bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 font-medium">
                    {formatXOF(impact.publicPriceAfter)}
                  </td>
                  <td className="px-3 py-2 text-right bg-orange-50 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400">
                    {formatXOF(impact.customerSavings)}
                  </td>
                </tr>

                {/* Commission */}
                <tr className="border-t bg-muted/30">
                  <td className="px-3 py-2 text-muted-foreground text-xs">Commission plateforme</td>
                  <td className="px-3 py-2 text-right text-xs text-muted-foreground">{formatXOF(impact.commissionBefore)}</td>
                  <td className="px-3 py-2 text-right text-xs text-muted-foreground">{formatXOF(impact.commissionAfter)}</td>
                  <td className="px-3 py-2 text-right text-xs text-muted-foreground">{formatXOF(impact.platformDelta)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-4 text-muted-foreground text-sm">
            {discountValue <= 0 
              ? "Entrez une valeur de réduction pour voir l'aperçu"
              : "Aucun prix configuré pour ce terrain"
            }
          </div>
        )}

        {/* Note explicative */}
        <div className="flex gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
          <Info className="w-4 h-4 shrink-0 mt-0.5" />
          <p>
            Le prix affiché au client changera. Les frais opérateurs s'ajouteront au checkout comme d'habitude. 
            Vous serez payé selon le montant net après promo.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default PromoPreview;
