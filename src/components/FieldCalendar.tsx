
import React, { useState, useEffect } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Clock, Euro, Users } from 'lucide-react';
import { format, addDays, startOfDay } from 'date-fns';
import { fr } from 'date-fns/locale';

interface TimeSlot {
  start_time: string;
  end_time: string;
  is_available: boolean;
  price: number;
}

interface FieldCalendarProps {
  fieldId: string;
  fieldPrice: number;
  onTimeSlotSelect: (date: Date, startTime: string, endTime: string, price: number) => void;
}

const FieldCalendar: React.FC<FieldCalendarProps> = ({ 
  fieldId, 
  fieldPrice, 
  onTimeSlotSelect 
}) => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(null);

  // Générer les créneaux par défaut (8h-22h, créneaux d'1h)
  const generateDefaultTimeSlots = (): TimeSlot[] => {
    const slots: TimeSlot[] = [];
    for (let hour = 8; hour < 22; hour++) {
      slots.push({
        start_time: `${hour.toString().padStart(2, '0')}:00`,
        end_time: `${(hour + 1).toString().padStart(2, '0')}:00`,
        is_available: true,
        price: fieldPrice
      });
    }
    return slots;
  };

  const { data: availableSlots = generateDefaultTimeSlots(), isLoading } = useQuery({
    queryKey: ['field-availability', fieldId, selectedDate],
    queryFn: async () => {
      if (!selectedDate) return generateDefaultTimeSlots();
      
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      
      // Récupérer les créneaux existants pour cette date
      const { data: existingSlots, error: slotsError } = await supabase
        .from('field_availability')
        .select('*')
        .eq('field_id', fieldId)
        .eq('date', dateStr);

      if (slotsError) throw slotsError;

      // Récupérer les réservations existantes pour cette date
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('start_time, end_time')
        .eq('field_id', fieldId)
        .eq('booking_date', dateStr)
        .in('status', ['pending', 'confirmed']);

      if (bookingsError) throw bookingsError;

      const defaultSlots = generateDefaultTimeSlots();
      
      // Marquer les créneaux déjà réservés comme non disponibles
      return defaultSlots.map(slot => {
        const isBooked = bookings?.some(booking => 
          booking.start_time === slot.start_time && booking.end_time === slot.end_time
        );
        
        // Vérifier s'il y a une disponibilité personnalisée pour ce créneau
        const customSlot = existingSlots?.find(es => 
          es.start_time === slot.start_time && es.end_time === slot.end_time
        );
        
        return {
          ...slot,
          is_available: isBooked ? false : (customSlot?.is_available ?? slot.is_available),
          price: customSlot?.price_override ?? slot.price
        };
      });
    },
    enabled: !!selectedDate
  });

  const handleTimeSlotClick = (slot: TimeSlot) => {
    if (!slot.is_available || !selectedDate) return;
    
    const slotKey = `${slot.start_time}-${slot.end_time}`;
    setSelectedTimeSlot(slotKey);
    onTimeSlotSelect(selectedDate, slot.start_time, slot.end_time, slot.price);
  };

  const disabledDays = {
    before: startOfDay(new Date()),
    after: addDays(new Date(), 30) // Limite à 30 jours dans le futur
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="w-5 h-5 text-green-600" />
            <span>Choisir une date</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            disabled={disabledDays}
            locale={fr}
            className="rounded-md border"
          />
        </CardContent>
      </Card>

      {selectedDate && (
        <Card>
          <CardHeader>
            <CardTitle>
              Créneaux disponibles - {format(selectedDate, 'EEEE dd MMMM yyyy', { locale: fr })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {Array(12).fill(0).map((_, i) => (
                  <div key={i} className="h-16 bg-gray-200 rounded animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {availableSlots.map((slot) => {
                  const slotKey = `${slot.start_time}-${slot.end_time}`;
                  const isSelected = selectedTimeSlot === slotKey;
                  
                  return (
                    <Button
                      key={slotKey}
                      variant={isSelected ? "default" : slot.is_available ? "outline" : "secondary"}
                      disabled={!slot.is_available}
                      onClick={() => handleTimeSlotClick(slot)}
                      className={`h-16 flex flex-col justify-center space-y-1 ${
                        isSelected ? 'bg-green-600 hover:bg-green-700' : ''
                      } ${!slot.is_available ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <div className="font-medium">
                        {slot.start_time} - {slot.end_time}
                      </div>
                      <div className="text-xs flex items-center space-x-1">
                        <Euro className="w-3 h-3" />
                        <span>{slot.price}€</span>
                      </div>
                      {!slot.is_available && (
                        <Badge variant="destructive" className="text-xs">
                          Réservé
                        </Badge>
                      )}
                    </Button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default FieldCalendar;
