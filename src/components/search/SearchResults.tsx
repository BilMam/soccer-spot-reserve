
import React from 'react';
import { MapPin } from 'lucide-react';
import FieldCard from '@/components/FieldCard';

interface TransformedField {
  id: string;
  name: string;
  location: string;
  price: number;
  rating: number;
  reviews: number;
  image: string;
  features: string[];
  capacity: number;
  type: string;
}

interface SearchResultsProps {
  fields: TransformedField[];
  isLoading: boolean;
  viewMode: 'grid' | 'list';
}

const SearchResults: React.FC<SearchResultsProps> = ({ fields, isLoading, viewMode }) => {
  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Recherche des terrains...</p>
      </div>
    );
  }

  if (fields.length === 0) {
    return (
      <div className="text-center py-12">
        <MapPin className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-600 mb-2">
          Aucun terrain trouvé
        </h3>
        <p className="text-gray-500">
          Essayez de modifier vos critères de recherche
        </p>
      </div>
    );
  }

  return (
    <div className={`grid gap-6 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
      {fields.map((field) => (
        <FieldCard key={field.id} field={field} />
      ))}
    </div>
  );
};

export default SearchResults;
