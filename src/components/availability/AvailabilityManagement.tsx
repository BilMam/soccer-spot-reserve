
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, Calendar, Clock, AlertTriangle } from 'lucide-react';
import PeriodSelector from './PeriodSelector';
import SlotCreationForm from './SlotCreationForm';
import AvailabilityCalendar from './AvailabilityCalendar';

interface AvailabilityManagementProps {
  fieldId: string;
  fieldName: string;
}

const AvailabilityManagement: React.FC<AvailabilityManagementProps> = ({
  fieldId,
  fieldName
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState<{
    startDate: Date;
    endDate: Date;
  } | null>(null);

  const handlePeriodSelect = (startDate: Date, endDate: Date) => {
    setSelectedPeriod({ startDate, endDate });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Gestion des créneaux - {fieldName}
          </CardTitle>
        </CardHeader>
      </Card>

      <Tabs defaultValue="period" className="space-y-6">
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
              onSlotsCreated={() => {
                // Optionnel: passer automatiquement à l'onglet calendrier
              }}
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
