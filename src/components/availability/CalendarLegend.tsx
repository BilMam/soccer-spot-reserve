
import React from 'react';

const CalendarLegend: React.FC = () => {
  return (
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
        <div className="w-4 h-4 bg-orange-200 border border-orange-300 rounded"></div>
        <span>Maintenance</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 bg-gray-200 border border-gray-300 rounded"></div>
        <span>Pas de créneaux</span>
      </div>
    </div>
  );
};

export default CalendarLegend;
