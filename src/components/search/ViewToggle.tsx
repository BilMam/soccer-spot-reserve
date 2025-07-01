
import React from 'react';
import { Button } from '@/components/ui/button';
import { Map, List, LayoutGrid } from 'lucide-react';

interface ViewToggleProps {
  viewMode: 'grid' | 'list' | 'map';
  onViewModeChange: (mode: 'grid' | 'list' | 'map') => void;
}

const ViewToggle: React.FC<ViewToggleProps> = ({ viewMode, onViewModeChange }) => {
  return (
    <div className="flex items-center space-x-1 bg-white border rounded-lg p-1 shadow-sm">
      <Button
        variant={viewMode === 'grid' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onViewModeChange('grid')}
        className="flex items-center space-x-2 px-3 py-2"
      >
        <LayoutGrid className="w-4 h-4" />
        <span className="hidden sm:inline">Grille</span>
      </Button>
      <Button
        variant={viewMode === 'list' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onViewModeChange('list')}
        className="flex items-center space-x-2 px-3 py-2"
      >
        <List className="w-4 h-4" />
        <span className="hidden sm:inline">Liste</span>
      </Button>
      <Button
        variant={viewMode === 'map' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onViewModeChange('map')}
        className="flex items-center space-x-2 px-3 py-2"
      >
        <Map className="w-4 h-4" />
        <span className="hidden sm:inline">Carte</span>
      </Button>
    </div>
  );
};

export default ViewToggle;
