
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Clock, Settings, AlertTriangle, CheckCircle } from 'lucide-react';
import { format, isSameDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useAvailabilityManagement } from '@/hooks/useAvailabilityManagement';

interface AvailabilityCalendarProps {
  fieldId: string;
  startDate: Date;
  endDate: Date;
}

interface AvailabilitySlot {
  id?: string;
  date: string;
  start_time: string;
  end_time: string;
  is_available: boolean;
  unavailability_reason?: string;
  is_maintenance?: boolean;
  notes?: string;
}

const AvailabilityCalendar: React.FC<AvailabilityCalendarProps> = ({
  fieldId,
  startDate,
  endDate
}) => {
  const { useFieldAvailabilityForPeriod, setSlotsUnavailable } = useAvailabilityManagement(fieldId);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [unavailabilityForm, setUnavailabilityForm] = useState({
    startTime: '08:00',
    endTime: '18:00',
    reason: 'Maintenance',
    notes: ''
  });

  const startDateStr = format(startDate, 'yyyy-MM-dd');
  const endDateStr = format(endDate, 'yyyy-MM-dd');
  
  const { data: availabilitySlots = [], isLoading } = useFieldAvailabilityForPeriod(startDateStr, endDateStr);

  // Grouper les créneaux par date
  const slotsByDate = availabilitySlots.reduce((acc, slot) => {
    if (!acc[slot.date]) {
      acc[slot.date] = [];
    }
    acc[slot.date].push(slot);
    return acc;
  }, {} as Record<string, AvailabilitySlot[]>);

  // Obtenir les statistiques pour une date
  const getDateStats = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const slots = slotsByDate[dateStr] || [];
    const total = slots.length;
    const available = slots.filter(s => s.is_available).length;
    const unavailable = slots.filter(s => !s.is_available).length;
    
    return { total, available, unavailable };
  };

  // Générer les jours de la période
  const generateDays = () => {
    const days = [];
    const current = new Date(startDate);
    
    while (current <= endDate) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    
    return days;
  };

  const handleSetUnavailable = async () => {
    if (!selectedDate) return;

    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    
    try {
      await setSlotsUnavailable.mutateAsync({
        date: dateStr,
        startTime: unavailabilityForm.startTime,
        endTime: unavailabilityForm.endTime,
        reason: unavailabilityForm.reason,
        notes: unavailabilityForm.notes
      });
      
      setSelectedDate(null);
      setUnavailabilityForm({
        startTime: '08:00',
        endTime: '18:00',
        reason: 'Maintenance',
        notes: ''
      });
    } catch (error) {
      console.error('Erreur lors de la définition d\'indisponibilité:', error);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Calendrier des disponibilités</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: 21 }).map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const days = generateDays();

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Calendrier des disponibilités
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Légende */}
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-200 border border-green-300 rounded"></div>
                <span>Disponible</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-200 border border-red-300 rounded"></div>
                <span>Indisponible</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-gray-200 border border-gray-300 rounded"></div>
                <span>Pas de créneaux</span>
              </div>
            </div>

            {/* Calendrier */}
            <div className="grid grid-cols-7 gap-2">
              {['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'].map(day => (
                <div key={day} className="p-2 text-center font-medium text-gray-500 border-b">
                  {day}
                </div>
              ))}
              
              {days.map((day, index) => {
                const stats = getDateStats(day);
                const hasSlots = stats.total > 0;
                const isUnavailable = stats.unavailable > 0;
                const isFullyAvailable = hasSlots && stats.unavailable === 0;
                
                return (
                  <Dialog key={index}>
                    <DialogTrigger asChild>
                      <Button
                        variant="ghost"
                        className={`h-16 p-2 flex flex-col items-center justify-center border cursor-pointer hover:shadow-md transition-all ${
                          isFullyAvailable ? 'bg-green-50 border-green-200' :
                          isUnavailable ? 'bg-red-50 border-red-200' :
                          'bg-gray-50 border-gray-200'
                        }`}
                        onClick={() => setSelectedDate(day)}
                      >
                        <span className="font-medium">{day.getDate()}</span>
                        {hasSlots && (
                          <div className="flex gap-1 mt-1">
                            {stats.available > 0 && (
                              <Badge variant="secondary" className="text-xs px-1 py-0 bg-green-100 text-green-700">
                                {stats.available}
                              </Badge>
                            )}
                            {stats.unavailable > 0 && (
                              <Badge variant="secondary" className="text-xs px-1 py-0 bg-red-100 text-red-700">
                                {stats.unavailable}
                              </Badge>
                            )}
                          </div>
                        )}
                      </Button>
                    </DialogTrigger>
                    
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>
                          {format(day, 'EEEE dd MMMM yyyy', { locale: fr })}
                        </DialogTitle>
                      </DialogHeader>
                      
                      <div className="space-y-4">
                        {/* Statistiques du jour */}
                        <div className="grid grid-cols-3 gap-4 text-center">
                          <div className="p-3 bg-gray-50 rounded">
                            <div className="text-lg font-bold">{stats.total}</div>
                            <div className="text-sm text-gray-600">Total</div>
                          </div>
                          <div className="p-3 bg-green-50 rounded">
                            <div className="text-lg font-bold text-green-700">{stats.available}</div>
                            <div className="text-sm text-gray-600">Disponibles</div>
                          </div>
                          <div className="p-3 bg-red-50 rounded">
                            <div className="text-lg font-bold text-red-700">{stats.unavailable}</div>
                            <div className="text-sm text-gray-600">Indisponibles</div>
                          </div>
                        </div>

                        {/* Formulaire d'indisponibilité */}
                        <div className="space-y-4 border-t pt-4">
                          <h4 className="font-medium">Marquer comme indisponible</h4>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="text-sm font-medium">Heure de début</label>
                              <Input
                                type="time"
                                value={unavailabilityForm.startTime}
                                onChange={(e) => setUnavailabilityForm(prev => ({ ...prev, startTime: e.target.value }))}
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium">Heure de fin</label>
                              <Input
                                type="time"
                                value={unavailabilityForm.endTime}
                                onChange={(e) => setUnavailabilityForm(prev => ({ ...prev, endTime: e.target.value }))}
                              />
                            </div>
                          </div>

                          <div>
                            <label className="text-sm font-medium">Raison</label>
                            <Select 
                              value={unavailabilityForm.reason} 
                              onValueChange={(value) => setUnavailabilityForm(prev => ({ ...prev, reason: value }))}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Maintenance">Maintenance</SelectItem>
                                <SelectItem value="Travaux">Travaux</SelectItem>
                                <SelectItem value="Événement privé">Événement privé</SelectItem>
                                <SelectItem value="Congés">Congés</SelectItem>
                                <SelectItem value="Autre">Autre</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <label className="text-sm font-medium">Notes (optionnel)</label>
                            <Textarea
                              value={unavailabilityForm.notes}
                              onChange={(e) => setUnavailabilityForm(prev => ({ ...prev, notes: e.target.value }))}
                              placeholder="Détails supplémentaires..."
                            />
                          </div>

                          <Button 
                            onClick={handleSetUnavailable}
                            disabled={setSlotsUnavailable.isPending}
                            className="w-full"
                          >
                            {setSlotsUnavailable.isPending ? 'Application...' : 'Marquer comme indisponible'}
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AvailabilityCalendar;
