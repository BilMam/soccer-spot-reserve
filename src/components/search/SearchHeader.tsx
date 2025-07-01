
import React from 'react';
import { MapPin } from 'lucide-react';
import ViewToggle from './ViewToggle';

interface SearchHeaderProps {
  resultsCount: number;
  location?: string;
  date?: string;
  timeSlot?: string;
  viewMode: 'grid' | 'list' | 'map';
  onViewModeChange: (mode: 'grid' | 'list' | 'map') => void;
}

const SearchHeader: React.FC<SearchHeaderProps> = ({
  resultsCount,
  location,
  date,
  timeSlot,
  viewMode,
  onViewModeChange
}) => {
  const getSearchSummary = () => {
    let summary = `${resultsCount} terrain${resultsCount > 1 ? 's' : ''} trouvé${resultsCount > 1 ? 's' : ''}`;
    
    if (location) summary += ` près de ${location}`;
    if (date) summary += ` pour le ${new Date(date).toLocaleDateString('fr-FR')}`;
    if (timeSlot) summary += ` à ${timeSlot}`;
    
    return summary;
  };

  return (
    <div className="flex justify-between items-center mb-6">
      <div className="flex items-center space-x-2">
        <MapPin className="w-5 h-5 text-gray-500" />
        <span className="text-gray-600">
          {getSearchSummary()}
        </span>
      </div>
      
      <div className="hidden md:flex">
        <ViewToggle viewMode={viewMode} onViewModeChange={onViewModeChange} />
      </div>
    </div>
  );
};

export default SearchHeader;
