
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, Clock, Settings } from 'lucide-react';
import { format, addDays, addWeeks, addMonths } from 'date-fns';
import { fr } from 'date-fns/locale';

interface PeriodSelectorProps {
  onPeriodSelect: (startDate: Date, endDate: Date) => void;
  selectedStartDate?: Date;
  selectedEndDate?: Date;
}

const PeriodSelector: React.FC<PeriodSelectorProps> = ({
  onPeriodSelect,
  selectedStartDate,
  selectedEndDate
}) => {
  const [customMode, setCustomMode] = useState(false);
  const [tempStartDate, setTempStartDate] = useState<Date>();
  const [tempEndDate, setTempEndDate] = useState<Date>();

  const quickPeriods = [
    {
      label: 'Aujourd\'hui',
      value: 'today',
      icon: CalendarDays,
      getDates: () => {
        const today = new Date();
        return { start: today, end: today };
      }
    },
    {
      label: 'Cette semaine',
      value: 'week',
      icon: CalendarDays,
      getDates: () => {
        const today = new Date();
        const start = new Date(today);
        const end = addDays(start, 6);
        return { start, end };
      }
    },
    {
      label: 'Ce mois',
      value: 'month',
      icon: CalendarDays,
      getDates: () => {
        const today = new Date();
        const start = new Date(today.getFullYear(), today.getMonth(), 1);
        const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        return { start, end };
      }
    },
    {
      label: 'Prochains 30 jours',
      value: '30days',
      icon: Clock,
      getDates: () => {
        const today = new Date();
        const end = addDays(today, 30);
        return { start: today, end };
      }
    }
  ];

  const handleQuickPeriod = (periodKey: string) => {
    const period = quickPeriods.find(p => p.value === periodKey);
    if (period) {
      const { start, end } = period.getDates();
      onPeriodSelect(start, end);
    }
  };

  const handleCustomPeriod = () => {
    if (tempStartDate && tempEndDate) {
      onPeriodSelect(tempStartDate, tempEndDate);
      setCustomMode(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Sélection de période
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Période actuelle */}
        {selectedStartDate && selectedEndDate && (
          <div className="p-3 bg-green-50 rounded-lg border">
            <p className="text-sm font-medium text-green-800">
              Période sélectionnée :
            </p>
            <p className="text-sm text-green-700">
              Du {format(selectedStartDate, 'dd MMMM yyyy', { locale: fr })} 
              {' '}au {format(selectedEndDate, 'dd MMMM yyyy', { locale: fr })}
            </p>
          </div>
        )}

        {/* Sélections rapides */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Sélections rapides</h4>
          <div className="grid grid-cols-2 gap-2">
            {quickPeriods.map((period) => {
              const Icon = period.icon;
              return (
                <Button
                  key={period.value}
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickPeriod(period.value)}
                  className="justify-start"
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {period.label}
                </Button>
              );
            })}
          </div>
        </div>

        {/* Sélection personnalisée */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">Période personnalisée</h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCustomMode(!customMode)}
            >
              {customMode ? 'Annuler' : 'Personnaliser'}
            </Button>
          </div>

          {customMode && (
            <div className="space-y-4 p-4 border rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Date de début</label>
                  <Calendar
                    mode="single"
                    selected={tempStartDate}
                    onSelect={setTempStartDate}
                    locale={fr}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Date de fin</label>
                  <Calendar
                    mode="single"
                    selected={tempEndDate}
                    onSelect={setTempEndDate}
                    locale={fr}
                    className="w-full"
                    disabled={(date) => tempStartDate ? date < tempStartDate : false}
                  />
                </div>
              </div>
              <Button 
                onClick={handleCustomPeriod}
                disabled={!tempStartDate || !tempEndDate}
                className="w-full"
              >
                Appliquer la période
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default PeriodSelector;
