
import React from 'react';
import { CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from 'lucide-react';
import CalendarLegend from './CalendarLegend';

const CalendarHeader: React.FC = () => {
  return (
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <Calendar className="w-5 h-5" />
        Calendrier des disponibilités
      </CardTitle>
    </CardHeader>
  );
};

export default CalendarHeader;
