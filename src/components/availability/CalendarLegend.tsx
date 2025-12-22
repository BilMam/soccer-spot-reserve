
import React from 'react';

const CalendarLegend: React.FC = () => {
  return (
    <div className="flex flex-wrap gap-4 text-sm">
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 bg-green-200 border border-green-300 rounded"></div>
        <span>Disponible</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 bg-blue-200 border border-blue-300 rounded"></div>
        <span>Réservé (en ligne)</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 bg-indigo-200 border border-indigo-300 rounded"></div>
        <span>📋 Réservé manuellement</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 bg-purple-200 border border-purple-300 rounded"></div>
        <span>🔁 Créneau récurrent</span>
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
  );
};

export default CalendarLegend;
