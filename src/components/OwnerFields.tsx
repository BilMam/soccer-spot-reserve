
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Star, Euro, Edit, Eye, ToggleLeft, ToggleRight, Clock, CheckCircle, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Field {
  id: string;
  name: string;
  location: string;
  price_per_hour: number;
  is_active: boolean;
  rating: number;
  total_reviews: number;
  status: string;
  admin_notes?: string;
}

interface OwnerFieldsProps {
  fields: Field[] | undefined;
  isLoading: boolean;
}

const OwnerFields = ({ fields, isLoading }: OwnerFieldsProps) => {
  const { toast } = useToast();
  const navigate = useNavigate();

  const toggleFieldStatus = async (fieldId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('fields')
        .update({ is_active: !currentStatus })
        .eq('id', fieldId);

      if (error) throw error;

      toast({
        title: "Statut mis à jour",
        description: `Le terrain a été ${!currentStatus ? 'activé' : 'désactivé'}`,
      });

      window.location.reload();
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le statut du terrain",
        variant: "destructive"
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="secondary" className="flex items-center space-x-1">
            <Clock className="w-3 h-3" />
            <span>En attente</span>
          </Badge>
        );
      case 'approved':
        return (
          <Badge variant="default" className="flex items-center space-x-1 bg-green-600">
            <CheckCircle className="w-3 h-3" />
            <span>Approuvé</span>
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="destructive" className="flex items-center space-x-1">
            <XCircle className="w-3 h-3" />
            <span>Rejeté</span>
          </Badge>
        );
      case 'suspended':
        return (
          <Badge variant="secondary" className="flex items-center space-x-1">
            <XCircle className="w-3 h-3" />
            <span>Suspendu</span>
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/3"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!fields || fields.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <MapPin className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun terrain enregistré</h3>
          <p className="text-gray-500 mb-4">Commencez par ajouter votre premier terrain pour commencer à recevoir des réservations.</p>
          <Button 
            className="bg-green-600 hover:bg-green-700"
            onClick={() => navigate('/add-field')}
          >
            Ajouter un terrain
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {fields.map((field) => (
          <Card key={field.id} className={`${(!field.is_active || field.status !== 'approved') ? 'opacity-60' : ''}`}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{field.name}</CardTitle>
                  <div className="flex items-center text-gray-500 mt-1">
                    <MapPin className="w-4 h-4 mr-1" />
                    <span className="text-sm">{field.location}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end space-y-2">
                  {getStatusBadge(field.status)}
                  <Badge variant={field.is_active ? "default" : "secondary"}>
                    {field.is_active ? "Actif" : "Inactif"}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {field.status === 'pending' && (
                <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-sm">
                  <p className="text-yellow-800">
                    <strong>En attente de validation :</strong> Votre terrain sera visible publiquement une fois approuvé par notre équipe.
                  </p>
                </div>
              )}

              {field.status === 'rejected' && field.admin_notes && (
                <div className="bg-red-50 border border-red-200 rounded p-3 text-sm">
                  <p className="text-red-800">
                    <strong>Raison du rejet :</strong> {field.admin_notes}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Euro className="w-4 h-4 text-green-600" />
                  <span className="font-medium">{field.price_per_hour}€/h</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Star className="w-4 h-4 text-yellow-500 fill-current" />
                  <span>{field.rating?.toFixed(1) || '0.0'}</span>
                  <span className="text-gray-500 text-sm">({field.total_reviews || 0})</span>
                </div>
              </div>

              <div className="flex space-x-2">
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => navigate(`/field/${field.id}`)}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Voir
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => navigate(`/edit-field/${field.id}`)}
                  disabled={field.status === 'rejected'}
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Modifier
                </Button>
                {field.status === 'approved' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => toggleFieldStatus(field.id, field.is_active)}
                  >
                    {field.is_active ? (
                      <ToggleRight className="w-4 h-4 text-green-600" />
                    ) : (
                      <ToggleLeft className="w-4 h-4 text-gray-400" />
                    )}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Bouton pour ajouter un nouveau terrain */}
      <Card className="border-dashed border-2 border-gray-300 hover:border-green-500 transition-colors">
        <CardContent className="p-8 text-center">
          <div className="flex flex-col items-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
              <MapPin className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900">Ajouter un nouveau terrain</h3>
              <p className="text-gray-500">Développez votre activité en ajoutant plus de terrains</p>
            </div>
            <Button 
              className="bg-green-600 hover:bg-green-700"
              onClick={() => navigate('/add-field')}
            >
              Ajouter un terrain
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OwnerFields;
