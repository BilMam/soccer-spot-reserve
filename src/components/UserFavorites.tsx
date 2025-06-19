
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Star, MapPin, Euro, Eye } from 'lucide-react';
import { useFavorites } from '@/hooks/useFavorites';
import FavoriteButton from '@/components/FavoriteButton';
import { useNavigate } from 'react-router-dom';

const UserFavorites: React.FC = () => {
  const { favorites, isLoading } = useFavorites();
  const navigate = useNavigate();

  const getFieldTypeLabel = (type: string) => {
    switch (type) {
      case 'natural_grass': return 'Gazon naturel';
      case 'synthetic': return 'Synthétique';
      case 'indoor': return 'Indoor';
      case 'street': return 'Bitume';
      default: return type;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Mes Terrains Favoris</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (favorites.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Mes Terrains Favoris</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="text-gray-400 mb-4">
              <Star className="w-12 h-12 mx-auto" />
            </div>
            <p className="text-gray-600 mb-4">Aucun terrain favori pour le moment</p>
            <Button onClick={() => navigate('/search')}>
              Découvrir des terrains
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mes Terrains Favoris ({favorites.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {favorites.map((favorite) => {
            const field = favorite.fields;
            if (!field) return null;
            
            return (
              <div key={field.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-lg">{field.name}</h3>
                      <FavoriteButton fieldId={field.id} />
                    </div>
                    
                    <div className="flex items-center text-gray-600 mb-2">
                      <MapPin className="w-4 h-4 mr-1" />
                      <span className="text-sm">{field.location}</span>
                    </div>

                    <div className="flex items-center gap-4 mb-3">
                      <Badge variant="outline">
                        {getFieldTypeLabel(field.field_type)}
                      </Badge>
                      
                      <div className="flex items-center space-x-1">
                        <Euro className="w-4 h-4 text-green-600" />
                        <span className="font-medium">{field.price_per_hour.toLocaleString()} XOF/h</span>
                      </div>

                      {field.rating > 0 && (
                        <div className="flex items-center space-x-1">
                          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          <span className="text-sm font-medium">{field.rating}</span>
                          <span className="text-sm text-gray-500">({field.total_reviews})</span>
                        </div>
                      )}
                    </div>

                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => navigate(`/field/${field.id}`)}
                      className="w-full sm:w-auto"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Voir les détails
                    </Button>
                  </div>

                  {field.images && field.images.length > 0 && (
                    <div className="ml-4 flex-shrink-0">
                      <img
                        src={field.images[0]}
                        alt={field.name}
                        className="w-20 h-20 object-cover rounded-lg"
                      />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default UserFavorites;
