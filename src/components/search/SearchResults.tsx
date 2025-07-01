
import React from 'react';
import FieldCard from '@/components/FieldCard';
import { AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface Field {
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
  latitude?: number;
  longitude?: number;
}

interface SearchResultsProps {
  fields: Field[];
  isLoading: boolean;
  viewMode: 'grid' | 'list' | 'map';
}

const SearchResults: React.FC<SearchResultsProps> = ({ fields, isLoading, viewMode }) => {
  if (isLoading) {
    return (
      <div className="space-y-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="bg-gray-300 h-48 rounded-lg mb-4"></div>
            <div className="h-4 bg-gray-300 rounded mb-2"></div>
            <div className="h-4 bg-gray-300 rounded w-2/3"></div>
          </div>
        ))}
      </div>
    );
  }

  if (fields.length === 0) {
    return (
      <Card className="p-8 text-center">
        <CardContent className="space-y-4">
          <AlertCircle className="w-12 h-12 mx-auto text-gray-400" />
          <div>
            <h3 className="text-lg font-semibold mb-2 text-gray-900">Aucun terrain trouvé</h3>
            <p className="text-gray-600 text-sm mb-4">
              Aucun terrain ne correspond à vos critères de recherche.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
              <h4 className="font-medium text-blue-900 mb-2">Suggestions :</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Élargissez votre zone de recherche</li>
                <li>• Supprimez quelques filtres</li>
                <li>• Vérifiez l'orthographe de votre recherche</li>
                <li>• Essayez des termes plus généraux</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const gridClass = viewMode === 'list' 
    ? 'space-y-4' 
    : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6';

  return (
    <div className={gridClass}>
      {fields.map((field) => (
        <FieldCard 
          key={field.id} 
          field={field}
          className={viewMode === 'list' ? 'flex-row' : ''}
        />
      ))}
    </div>
  );
};

export default SearchResults;
