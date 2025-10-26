
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Filter, ChevronDown, ChevronUp } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { SPORTS, SPORT_FIELD_TYPES, SportType } from '@/constants/sports';

interface SearchFiltersProps {
  filters: {
    priceMin: string;
    priceMax: string;
    fieldType: string;
    capacity: string;
    sortBy: string;
    sport: string;
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
      sortBy: 'rating',
      sport: 'all',
    });
  };

  // Options dynamiques de type de surface selon le sport sélectionné
  const getFieldTypeOptions = () => {
    if (filters.sport === 'all') {
      return [{ value: 'all', label: 'Tous les types' }];
    }
    const sportFieldTypes = SPORT_FIELD_TYPES[filters.sport as SportType] || [];
    return [
      { value: 'all', label: 'Tous les types' },
      ...sportFieldTypes
    ];
  };

  return (
    <Card className="lg:sticky lg:top-8">
      <CardContent className="p-4 lg:p-6">
        {/* Mobile: Collapsible version */}
        <div className="lg:hidden">
          <Collapsible open={isOpen} onOpenChange={setIsOpen}>
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
              <FilterContent 
                filters={filters} 
                handleFilterChange={handleFilterChange} 
                resetFilters={resetFilters} 
                isMobile={true}
                getFieldTypeOptions={getFieldTypeOptions}
              />
            </CollapsibleContent>
          </Collapsible>
        </div>

        {/* Desktop: Always visible sidebar */}
        <div className="hidden lg:block">
          <div className="flex items-center space-x-2 mb-6">
            <Filter className="w-5 h-5" />
            <h3 className="text-lg font-semibold">Filtres</h3>
          </div>
          <FilterContent 
            filters={filters} 
            handleFilterChange={handleFilterChange} 
            resetFilters={resetFilters} 
            isMobile={false}
            getFieldTypeOptions={getFieldTypeOptions}
          />
        </div>
      </CardContent>
    </Card>
  );
};

// Separate component for the filter content
const FilterContent: React.FC<{
  filters: any;
  handleFilterChange: (key: string, value: string) => void;
  resetFilters: () => void;
  isMobile: boolean;
  getFieldTypeOptions: () => { value: string; label: string }[];
}> = ({ filters, handleFilterChange, resetFilters, isMobile, getFieldTypeOptions }) => (
  <div className={isMobile ? "space-y-4" : "space-y-6"}>
    {/* Filtre Sport */}
    <div>
      <label className="text-sm font-medium text-gray-700 mb-3 block">
        Sport
      </label>
      <Select value={filters.sport} onValueChange={(value) => handleFilterChange('sport', value)}>
        <SelectTrigger className={isMobile ? "h-12 text-base" : "h-10 text-sm"}>
          <SelectValue placeholder="Tous les sports" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tous les sports</SelectItem>
          {SPORTS.map((sport) => (
            <SelectItem key={sport.value} value={sport.value}>
              {sport.icon} {sport.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>

    <div>
      <label className="text-sm font-medium text-gray-700 mb-3 block">
        Prix par heure (FCFA)
      </label>
      <div className="flex space-x-3">
        <Input
          placeholder="Min"
          value={filters.priceMin}
          onChange={(e) => handleFilterChange('priceMin', e.target.value)}
          className={isMobile ? "h-12 text-base" : "h-10 text-sm"}
        />
        <Input
          placeholder="Max"
          value={filters.priceMax}
          onChange={(e) => handleFilterChange('priceMax', e.target.value)}
          className={isMobile ? "h-12 text-base" : "h-10 text-sm"}
        />
      </div>
    </div>

    {/* Type de surface - Options dynamiques */}
    <div>
      <label className="text-sm font-medium text-gray-700 mb-3 block">
        Type de surface
      </label>
      <Select value={filters.fieldType} onValueChange={(value) => handleFilterChange('fieldType', value)}>
        <SelectTrigger className={isMobile ? "h-12 text-base" : "h-10 text-sm"}>
          <SelectValue placeholder="Tous les types" />
        </SelectTrigger>
        <SelectContent>
          {getFieldTypeOptions().map((type) => (
            <SelectItem key={type.value} value={type.value}>
              {type.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>

    <div>
      <label className="text-sm font-medium text-gray-700 mb-3 block">
        Capacité minimum
      </label>
      <Input
        placeholder="Nombre de participants"
        value={filters.capacity}
        onChange={(e) => handleFilterChange('capacity', e.target.value)}
        className={isMobile ? "h-12 text-base" : "h-10 text-sm"}
      />
    </div>

    <div>
      <label className="text-sm font-medium text-gray-700 mb-3 block">
        Trier par
      </label>
      <Select value={filters.sortBy} onValueChange={(value) => handleFilterChange('sortBy', value)}>
        <SelectTrigger className={isMobile ? "h-12 text-base" : "h-10 text-sm"}>
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
      className={isMobile ? "w-full h-12 text-base" : "w-full h-10 text-sm"}
    >
      Réinitialiser
    </Button>
  </div>
);

export default SearchFilters;
