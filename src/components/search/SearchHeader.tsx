
import React from 'react';
import { MapPin } from 'lucide-react';

interface SearchHeaderProps {
  resultsCount: number;
  location?: string;
  date?: string;
  timeSlot?: string;
}

const SearchHeader: React.FC<SearchHeaderProps> = ({
  resultsCount,
  location,
  date,
  timeSlot
}) => {
  const getSearchSummary = () => {
    let summary = `${resultsCount} terrain${resultsCount > 1 ? 's' : ''} trouvé${resultsCount > 1 ? 's' : ''}`;
    
    if (location) summary += ` près de ${location}`;
    if (date) summary += ` pour le ${new Date(date).toLocaleDateString('fr-FR')}`;
    if (timeSlot) summary += ` à ${timeSlot}`;
    
    return summary;
  };

  return (
    <div className="flex items-center space-x-2 mb-6">
      <MapPin className="w-5 h-5 text-gray-500" />
      <span className="text-gray-600 text-sm sm:text-base">
        {getSearchSummary()}
      </span>
    </div>
  );
};

export default SearchHeader;
