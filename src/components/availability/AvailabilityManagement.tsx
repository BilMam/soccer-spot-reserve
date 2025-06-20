
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Settings, Calendar, Clock, AlertTriangle, RotateCcw } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import PeriodSelector from './PeriodSelector';
import SlotCreationForm from './SlotCreationForm';
import AvailabilityCalendar from './AvailabilityCalendar';
import { usePersistentPeriod } from '@/hooks/usePersistentPeriod';

interface AvailabilityManagementProps {
  fieldId: string;
  fieldName: string;
}

const AvailabilityManagement: React.FC<AvailabilityManagementProps> = ({
  fieldId,
  fieldName
}) => {
  const { selectedPeriod, updatePeriod, clearPeriod } = usePersistentPeriod(fieldId);
  const [activeTab, setActiveTab] = useState('period');
  const [isPeriodRestored, setIsPeriodRestored] = useState(false);

  useEffect(() => {
    // Si une période a été restaurée, passer automatiquement à la création
    if (selectedPeriod && !isPeriodRestored) {
      setIsPeriodRestored(true);
      setActiveTab('creation');
    }
  }, [selectedPeriod, isPeriodRestored]);

  const handlePeriodSelect = (startDate: Date, endDate: Date) => {
    updatePeriod(startDate, endDate);
    setActiveTab('creation');
  };

  const handleSlotsCreated = (slotsCount: number) => {
    console.log(`${slotsCount} créneaux créés avec succès`);
    // Passer automatiquement au calendrier après création
    setTimeout(() => {
      setActiveTab('calendar');
    }, 2000);
  };

  const handleViewCalendar = () => {
    setActiveTab('calendar');
  };

  const handleClearPeriod = () => {
    clearPeriod();
    setIsPeriodRestored(false);
    setActiveTab('period');
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Gestion des créneaux - {fieldName}
            {selectedPeriod && isPeriodRestored && (
              <Badge variant="secondary" className="ml-2 bg-green-100 text-green-700">
                <RotateCcw className="w-3 h-3 mr-1" />
                Période restaurée
              </Badge>
            )}
          </CardTitle>
          {selectedPeriod && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Période active : Du {format(selectedPeriod.startDate, 'dd MMMM yyyy', { locale: fr })} 
                {' '}au {format(selectedPeriod.endDate, 'dd MMMM yyyy', { locale: fr })}
              </p>
              <button
                onClick={handleClearPeriod}
                className="text-xs text-gray-500 hover:text-gray-700 underline"
              >
                Changer de période
              </button>
            </div>
          )}
        </CardHeader>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="period">Sélection période</TabsTrigger>
          <TabsTrigger value="creation">Création créneaux</TabsTrigger>
          <TabsTrigger value="calendar">Calendrier</TabsTrigger>
        </TabsList>

        <TabsContent value="period">
          <PeriodSelector
            onPeriodSelect={handlePeriodSelect}
            selectedStartDate={selectedPeriod?.startDate}
            selectedEndDate={selectedPeriod?.endDate}
          />
        </TabsContent>

        <TabsContent value="creation">
          {selectedPeriod ? (
            <SlotCreationForm
              fieldId={fieldId}
              startDate={selectedPeriod.startDate}
              endDate={selectedPeriod.endDate}
              onSlotsCreated={handleSlotsCreated}
              onViewCalendar={handleViewCalendar}
            />
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Clock className="w-12 h-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-600 mb-2">
                  Sélectionnez d'abord une période
                </h3>
                <p className="text-gray-500 text-center">
                  Rendez-vous dans l'onglet "Sélection période" pour choisir 
                  la période pour laquelle vous souhaitez créer des créneaux.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="calendar">
          {selectedPeriod ? (
            <AvailabilityCalendar
              fieldId={fieldId}
              startDate={selectedPeriod.startDate}
              endDate={selectedPeriod.endDate}
            />
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Calendar className="w-12 h-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-600 mb-2">
                  Sélectionnez d'abord une période
                </h3>
                <p className="text-gray-500 text-center">
                  Rendez-vous dans l'onglet "Sélection période" pour voir 
                  le calendrier des disponibilités.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AvailabilityManagement;
