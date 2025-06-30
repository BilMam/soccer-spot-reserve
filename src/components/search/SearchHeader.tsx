
import React from 'react';
import { Button } from '@/components/ui/button';
import { MapPin, Grid, List } from 'lucide-react';

interface SearchHeaderProps {
  resultsCount: number;
  location?: string;
  date?: string;
  timeSlot?: string;
  viewMode: 'grid' | 'list';
  onViewModeChange: (mode: 'grid' | 'list') => void;
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
      
      <div className="hidden md:flex items-center space-x-2">
        <Button
          variant={viewMode === 'grid' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onViewModeChange('grid')}
        >
          <Grid className="w-4 h-4" />
        </Button>
        <Button
          variant={viewMode === 'list' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onViewModeChange('list')}
        >
          <List className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

export default SearchHeader;
