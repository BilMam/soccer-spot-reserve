
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Filter, ChevronDown, ChevronUp } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface SearchFiltersProps {
  filters: {
    priceMin: string;
    priceMax: string;
    fieldType: string;
    capacity: string;
    sortBy: string;
  };
  onFiltersChange: (filters: any) => void;
}

const SearchFilters: React.FC<SearchFiltersProps> = ({ filters, onFiltersChange }) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleFilterChange = (key: string, value: string) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const resetFilters = () => {
    onFiltersChange({
      priceMin: '',
      priceMax: '',
      fieldType: 'all',
      capacity: '',
      sortBy: 'rating'
    });
  };

  return (
    <Card className="lg:sticky lg:top-8">
      <CardContent className="p-4 lg:p-6">
        {/* Mobile: Collapsible header, Desktop: Always visible */}
        <Collapsible open={isOpen} onOpenChange={setIsOpen} className="lg:hidden">
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="w-full flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Filter className="w-5 h-5" />
                <span className="text-lg font-semibold">Filtres</span>
              </div>
              {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </CollapsibleTrigger>
          
          <CollapsibleContent className="space-y-6">
            <FilterContent filters={filters} handleFilterChange={handleFilterChange} resetFilters={resetFilters} />
          </CollapsibleContent>
        </Collapsible>

        {/* Desktop: Always visible header and content */}
        <div className="hidden lg:block">
          <div className="flex items-center space-x-2 mb-6">
            <Filter className="w-5 h-5" />
            <h3 className="text-lg font-semibold">Filtres</h3>
          </div>
          <FilterContent filters={filters} handleFilterChange={handleFilterChange} resetFilters={resetFilters} />
        </div>
      </CardContent>
    </Card>
  );
};

// Separate component for the filter content to avoid duplication
const FilterContent: React.FC<{
  filters: any;
  handleFilterChange: (key: string, value: string) => void;
  resetFilters: () => void;
}> = ({ filters, handleFilterChange, resetFilters }) => (
  <div className="space-y-4 lg:space-y-6">
    <div>
      <label className="text-sm font-medium text-gray-700 mb-3 block">
        Prix par heure
      </label>
      <div className="flex space-x-3">
        <Input
          placeholder="Min"
          value={filters.priceMin}
          onChange={(e) => handleFilterChange('priceMin', e.target.value)}
          className="h-12 lg:h-10 text-base lg:text-sm"
        />
        <Input
          placeholder="Max"
          value={filters.priceMax}
          onChange={(e) => handleFilterChange('priceMax', e.target.value)}
          className="h-12 lg:h-10 text-base lg:text-sm"
        />
      </div>
    </div>

    <div>
      <label className="text-sm font-medium text-gray-700 mb-3 block">
        Type de terrain
      </label>
      <Select value={filters.fieldType} onValueChange={(value) => handleFilterChange('fieldType', value)}>
        <SelectTrigger className="h-12 lg:h-10 text-base lg:text-sm">
          <SelectValue placeholder="Tous les types" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tous les types</SelectItem>
          <SelectItem value="natural_grass">Gazon naturel</SelectItem>
          <SelectItem value="synthetic">Synthétique</SelectItem>
          <SelectItem value="indoor">Indoor</SelectItem>
          <SelectItem value="street">Bitume</SelectItem>
        </SelectContent>
      </Select>
    </div>

    <div>
      <label className="text-sm font-medium text-gray-700 mb-3 block">
        Capacité minimum
      </label>
      <Input
        placeholder="Nombre de joueurs"
        value={filters.capacity}
        onChange={(e) => handleFilterChange('capacity', e.target.value)}
        className="h-12 lg:h-10 text-base lg:text-sm"
      />
    </div>

    <div>
      <label className="text-sm font-medium text-gray-700 mb-3 block">
        Trier par
      </label>
      <Select value={filters.sortBy} onValueChange={(value) => handleFilterChange('sortBy', value)}>
        <SelectTrigger className="h-12 lg:h-10 text-base lg:text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="rating">Mieux notés</SelectItem>
          <SelectItem value="price_asc">Prix croissant</SelectItem>
          <SelectItem value="price_desc">Prix décroissant</SelectItem>
        </SelectContent>
      </Select>
    </div>

    <Button 
      onClick={resetFilters}
      variant="outline"
      className="w-full h-12 lg:h-10 text-base lg:text-sm"
    >
      Réinitialiser
    </Button>
  </div>
);

export default SearchFilters;
