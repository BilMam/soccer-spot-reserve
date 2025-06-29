
import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Filter } from 'lucide-react';

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
    <Card className="sticky top-8">
      <CardContent className="p-6">
        <div className="flex items-center space-x-2 mb-6">
          <Filter className="w-5 h-5" />
          <h3 className="text-lg font-semibold">Filtres</h3>
        </div>

        <div className="space-y-6">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Prix par heure
            </label>
            <div className="flex space-x-2">
              <Input
                placeholder="Min"
                value={filters.priceMin}
                onChange={(e) => handleFilterChange('priceMin', e.target.value)}
              />
              <Input
                placeholder="Max"
                value={filters.priceMax}
                onChange={(e) => handleFilterChange('priceMax', e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Type de terrain
            </label>
            <Select value={filters.fieldType} onValueChange={(value) => handleFilterChange('fieldType', value)}>
              <SelectTrigger>
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
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Capacité minimum
            </label>
            <Input
              placeholder="Nombre de joueurs"
              value={filters.capacity}
              onChange={(e) => handleFilterChange('capacity', e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Trier par
            </label>
            <Select value={filters.sortBy} onValueChange={(value) => handleFilterChange('sortBy', value)}>
              <SelectTrigger>
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
            className="w-full"
          >
            Réinitialiser
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default SearchFilters;
