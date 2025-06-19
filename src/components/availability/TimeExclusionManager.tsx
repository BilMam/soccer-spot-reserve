
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { X, Plus, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface TimeExclusion {
  date: Date;
  startTime: string;
  endTime: string;
  reason?: string;
}

interface TimeExclusionManagerProps {
  startDate: Date;
  endDate: Date;
  exclusions: TimeExclusion[];
  onExclusionsChange: (exclusions: TimeExclusion[]) => void;
}

const TimeExclusionManager: React.FC<TimeExclusionManagerProps> = ({
  startDate,
  endDate,
  exclusions,
  onExclusionsChange
}) => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [newExclusion, setNewExclusion] = useState({
    startTime: '12:00',
    endTime: '14:00',
    reason: ''
  });

  const generateDateRange = () => {
    const dates = [];
    const current = new Date(startDate);
    
    while (current <= endDate) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    
    return dates;
  };

  const addExclusion = () => {
    if (!selectedDate) return;

    const exclusion: TimeExclusion = {
      date: selectedDate,
      startTime: newExclusion.startTime,
      endTime: newExclusion.endTime,
      reason: newExclusion.reason || undefined
    };

    onExclusionsChange([...exclusions, exclusion]);
    setNewExclusion({ startTime: '12:00', endTime: '14:00', reason: '' });
  };

  const removeExclusion = (index: number) => {
    const updated = exclusions.filter((_, i) => i !== index);
    onExclusionsChange(updated);
  };

  const getExclusionsForDate = (date: Date) => {
    return exclusions.filter(exc => 
      format(exc.date, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
    );
  };

  const dateRange = generateDateRange();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Exclusions horaires spécifiques
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Sélection de date */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium mb-3">Sélectionner un jour</h4>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              disabled={(date) => date < startDate || date > endDate}
              locale={fr}
              className="rounded-md border"
            />
          </div>

          {/* Formulaire d'exclusion */}
          {selectedDate && (
            <div className="space-y-4">
              <h4 className="font-medium">
                Exclure des créneaux le {format(selectedDate, 'EEEE dd MMMM', { locale: fr })}
              </h4>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium">Début</label>
                  <Input
                    type="time"
                    value={newExclusion.startTime}
                    onChange={(e) => setNewExclusion(prev => ({ ...prev, startTime: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Fin</label>
                  <Input
                    type="time"
                    value={newExclusion.endTime}
                    onChange={(e) => setNewExclusion(prev => ({ ...prev, endTime: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Raison (optionnel)</label>
                <Input
                  placeholder="Ex: Pause déjeuner, maintenance..."
                  value={newExclusion.reason}
                  onChange={(e) => setNewExclusion(prev => ({ ...prev, reason: e.target.value }))}
                />
              </div>

              <Button
                onClick={addExclusion}
                disabled={!selectedDate || newExclusion.startTime >= newExclusion.endTime}
                className="w-full"
                size="sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                Ajouter l'exclusion
              </Button>

              {/* Aperçu des exclusions pour cette date */}
              {getExclusionsForDate(selectedDate).length > 0 && (
                <div className="border-t pt-3">
                  <p className="text-sm font-medium mb-2">Exclusions déjà définies :</p>
                  <div className="space-y-1">
                    {getExclusionsForDate(selectedDate).map((exc, idx) => (
                      <div key={idx} className="text-sm text-gray-600">
                        {exc.startTime} - {exc.endTime}
                        {exc.reason && ` (${exc.reason})`}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Liste des exclusions */}
        {exclusions.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium">Exclusions programmées ({exclusions.length})</h4>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {exclusions.map((exclusion, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium text-sm">
                      {format(exclusion.date, 'EEEE dd MMMM', { locale: fr })}
                    </div>
                    <div className="text-sm text-gray-600">
                      {exclusion.startTime} - {exclusion.endTime}
                      {exclusion.reason && ` • ${exclusion.reason}`}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeExclusion(index)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-100"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TimeExclusionManager;
