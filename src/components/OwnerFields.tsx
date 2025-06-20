
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { MapPin, Users, Clock, CheckCircle, AlertCircle, Plus } from 'lucide-react';

interface Field {
  id: string;
  name: string;
  location: string;
  city: string;
  price_per_hour: number;
  capacity: number;
  field_type: string;
  is_active: boolean;
  rating: number;
  total_reviews: number;
  images: string[];
}

interface OwnerFieldsProps {
  fields?: Field[];
  isLoading: boolean;
}

const OwnerFields: React.FC<OwnerFieldsProps> = ({ fields, isLoading }) => {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Mes terrains</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStatusBadge = (isActive: boolean) => {
    if (isActive) {
      return (
        <Badge variant="default" className="bg-green-100 text-green-800 border-green-300">
          <CheckCircle className="w-4 h-4 mr-1" />
          Approuvé
        </Badge>
      );
    } else {
      return (
        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
          <Clock className="w-4 h-4 mr-1" />
          En attente d'approbation
        </Badge>
      );
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Mes terrains
          <Button onClick={() => navigate('/add-field')} className="flex items-center space-x-2">
            <Plus className="w-4 h-4" />
            <span>Ajouter un terrain</span>
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!fields || fields.length === 0 ? (
          <div className="text-center py-12">
            <MapPin className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-600 mb-2">
              Aucun terrain ajouté
            </h3>
            <p className="text-gray-500 mb-6">
              Commencez par ajouter votre premier terrain pour commencer à recevoir des réservations.
            </p>
            <Button onClick={() => navigate('/add-field')}>
              Ajouter mon premier terrain
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Résumé des statuts */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {fields.length}
                </div>
                <div className="text-sm text-gray-600">Total</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {fields.filter(f => f.is_active).length}
                </div>
                <div className="text-sm text-gray-600">Approuvés</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {fields.filter(f => !f.is_active).length}
                </div>
                <div className="text-sm text-gray-600">En attente</div>
              </div>
            </div>

            {/* Liste des terrains */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {fields.map((field) => (
                <Card key={field.id} className="relative">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-lg font-semibold">{field.name}</h3>
                      {getStatusBadge(field.is_active)}
                    </div>
                    
                    <div className="space-y-2 text-sm text-gray-600 mb-4">
                      <div className="flex items-center">
                        <MapPin className="w-4 h-4 mr-2" />
                        {field.location}, {field.city}
                      </div>
                      <div className="flex items-center">
                        <Users className="w-4 h-4 mr-2" />
                        {field.capacity} joueurs
                      </div>
                      <div className="font-medium text-gray-900">
                        {field.price_per_hour.toLocaleString()} XOF/heure
                      </div>
                    </div>

                    {!field.is_active && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                        <div className="flex items-start">
                          <AlertCircle className="w-4 h-4 text-yellow-600 mr-2 mt-0.5" />
                          <div className="text-sm">
                            <p className="text-yellow-800 font-medium">En cours d'examen</p>
                            <p className="text-yellow-700">
                              Notre équipe examine votre terrain. Vous recevrez une notification une fois approuvé.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/edit-field/${field.id}`)}
                      >
                        Modifier
                      </Button>
                      {field.is_active && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/field/${field.id}`)}
                        >
                          Voir l'annonce
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default OwnerFields;
