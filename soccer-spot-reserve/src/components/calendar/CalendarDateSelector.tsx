
import React from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock } from 'lucide-react';
import { addDays, startOfDay } from 'date-fns';
import { fr } from 'date-fns/locale';

interface CalendarDateSelectorProps {
  selectedDate: Date | undefined;
  onDateSelect: (date: Date | undefined) => void;
}

const CalendarDateSelector: React.FC<CalendarDateSelectorProps> = ({
  selectedDate,
  onDateSelect
}) => {
  const disabledDays = {
    before: startOfDay(new Date()),
    after: addDays(new Date(), 30)
  };

  return (
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
          onSelect={onDateSelect}
          disabled={disabledDays}
          locale={fr}
          className="rounded-md border"
        />
      </CardContent>
    </Card>
  );
};

export default CalendarDateSelector;
