
import React from 'react';
import { Button } from '@/components/ui/button';
import { Map, List, Grid } from 'lucide-react';

interface ViewToggleProps {
  viewMode: 'grid' | 'list' | 'map';
  onViewModeChange: (mode: 'grid' | 'list' | 'map') => void;
}

const ViewToggle: React.FC<ViewToggleProps> = ({ viewMode, onViewModeChange }) => {
  return (
    <div className="flex items-center space-x-2">
      <Button
        variant={viewMode === 'grid' ? 'default' : 'outline'}
        size="sm"
        onClick={() => onViewModeChange('grid')}
        className="flex items-center space-x-1"
      >
        <Grid className="w-4 h-4" />
        <span className="hidden sm:inline">Grille</span>
      </Button>
      <Button
        variant={viewMode === 'list' ? 'default' : 'outline'}
        size="sm"
        onClick={() => onViewModeChange('list')}
        className="flex items-center space-x-1"
      >
        <List className="w-4 h-4" />
        <span className="hidden sm:inline">Liste</span>
      </Button>
      <Button
        variant={viewMode === 'map' ? 'default' : 'outline'}
        size="sm"
        onClick={() => onViewModeChange('map')}
        className="flex items-center space-x-1"
      >
        <Map className="w-4 h-4" />
        <span className="hidden sm:inline">Carte</span>
      </Button>
    </div>
  );
};

export default ViewToggle;
