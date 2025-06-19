
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { MapPin, Users, Clock, Calendar, Euro } from 'lucide-react';
import type { Field } from '@/types/admin';

interface FieldDetailDialogProps {
  field: Field | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const FieldDetailDialog: React.FC<FieldDetailDialogProps> = ({
  field,
  open,
  onOpenChange
}) => {
  if (!field) return null;

  const getFieldTypeLabel = (type: string) => {
    switch (type) {
      case 'natural_grass': return 'Gazon naturel';
      case 'synthetic': return 'Synthétique';
      case 'indoor': return 'Indoor';
      case 'street': return 'Bitume';
      default: return type;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{field.name}</span>
            <Badge variant={field.is_active ? "default" : "destructive"}>
              {field.is_active ? "Actif" : "Inactif"}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informations générales */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Informations générales</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <MapPin className="w-4 h-4 text-gray-500" />
                <span className="text-sm">{field.location}</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4 text-gray-500" />
                <span className="text-sm">{field.capacity} personnes max</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <Euro className="w-4 h-4 text-gray-500" />
                <span className="text-sm">{field.price_per_hour.toLocaleString()} XOF/heure</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <span className="text-sm">Créé le {new Date(field.created_at).toLocaleDateString('fr-FR')}</span>
              </div>
            </div>

            <div>
              <span className="text-sm font-medium">Type de terrain : </span>
              <Badge variant="outline">{getFieldTypeLabel(field.field_type)}</Badge>
            </div>
          </div>

          <Separator />

          {/* Propriétaire */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Propriétaire</h3>
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="font-medium">{field.profiles?.full_name}</p>
              <p className="text-sm text-gray-600">{field.profiles?.email}</p>
            </div>
          </div>

          <Separator />

          {/* Description */}
          {field.description && (
            <>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">Description</h3>
                <p className="text-sm text-gray-700 leading-relaxed">{field.description}</p>
              </div>
              <Separator />
            </>
          )}

          {/* Historique */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Historique</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Date de création :</span>
                <span>{new Date(field.created_at).toLocaleDateString('fr-FR')} à {new Date(field.created_at).toLocaleTimeString('fr-FR')}</span>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
