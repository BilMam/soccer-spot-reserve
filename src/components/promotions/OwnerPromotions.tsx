import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Ticket, TrendingUp, Users, Percent, Loader2 } from 'lucide-react';
import { usePromoCodes, PromoCodeWithDetails } from '@/hooks/usePromoCodes';
import { usePromoStats } from '@/hooks/usePromoStats';
import { usePromoCreation } from '@/hooks/usePromoCreation';
import { useOwnerFields } from '@/hooks/useOwnerFields';
import PromoCard from './PromoCard';
import PromoWizard from './wizard/PromoWizard';
import { formatXOF } from '@/utils/publicPricing';

interface OwnerPromotionsProps {
  ownerId: string;
}

const OwnerPromotions: React.FC<OwnerPromotionsProps> = ({ ownerId }) => {
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'expired'>('active');
  const { data: promoCodes, isLoading } = usePromoCodes(ownerId, statusFilter);
  const { data: stats } = usePromoStats(ownerId);
  const { data: fields } = useOwnerFields();

  const {
    isOpen, step, wizardData,
    openWizard, closeWizard, nextStep, prevStep,
    updateWizardData, generateCode, createPromo, toggleStatus, deletePromo,
    isCreating
  } = usePromoCreation(ownerId);

  const statsCards = [
    { label: 'Promos actives', value: stats?.activePromos || 0, icon: Ticket, color: 'text-green-600' },
    { label: 'Utilisations ce mois', value: stats?.usagesThisMonth || 0, icon: Users, color: 'text-blue-600' },
    { label: 'Économies clients', value: formatXOF(stats?.revenueFromPromos || 0), icon: TrendingUp, color: 'text-purple-600' },
    { label: 'Taux conversion', value: `${stats?.conversionRate || 0}%`, icon: Percent, color: 'text-orange-600' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Promotions</h2>
          <p className="text-muted-foreground">Créez et gérez vos codes promo</p>
        </div>
        <Button onClick={() => openWizard()} className="bg-green-600 hover:bg-green-700">
          <Plus className="w-4 h-4 mr-2" />
          Nouvelle promotion
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statsCards.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <stat.icon className={`w-8 h-8 ${stat.color}`} />
                <div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
        <TabsList>
          <TabsTrigger value="active">Actives</TabsTrigger>
          <TabsTrigger value="expired">Terminées</TabsTrigger>
          <TabsTrigger value="all">Toutes</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Promo List */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : promoCodes && promoCodes.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {promoCodes.map((promo) => (
            <PromoCard
              key={promo.id}
              promo={promo}
              onToggleStatus={(id, status) => toggleStatus({ promoId: id, newStatus: status })}
              onDelete={deletePromo}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Ticket className="w-16 h-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-medium mb-2">Aucune promotion</h3>
            <p className="text-muted-foreground text-center mb-4">
              Créez votre première promotion pour attirer plus de clients
            </p>
            <Button onClick={() => openWizard()}>
              <Plus className="w-4 h-4 mr-2" />
              Créer une promotion
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Wizard */}
      <PromoWizard
        isOpen={isOpen}
        step={step}
        wizardData={wizardData}
        fields={fields?.map(f => ({ 
          id: f.id, 
          name: f.name, 
          location: f.location,
          net_price_1h: f.net_price_1h,
          net_price_1h30: f.net_price_1h30,
          net_price_2h: f.net_price_2h,
          price_per_hour: f.price_per_hour
        })) || []}
        isCreating={isCreating}
        onClose={closeWizard}
        onPrevStep={prevStep}
        onNextStep={nextStep}
        onUpdateData={updateWizardData}
        onGenerateCode={generateCode}
        onCreate={createPromo}
      />
    </div>
  );
};

export default OwnerPromotions;
