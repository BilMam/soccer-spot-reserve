
import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Eye, Clock } from 'lucide-react';
import type { Field } from '@/types/admin';

interface FieldCardProps {
  field: Field;
  onApprove: (id: string) => void;
  isApproving: boolean;
}

export const FieldCard: React.FC<FieldCardProps> = ({ field, onApprove, isApproving }) => {
  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-semibold text-lg">{field.name}</h3>
          <p className="text-gray-600">{field.location}</p>
          <p className="text-sm text-gray-500">
            Propriétaire: {field.profiles?.full_name} ({field.profiles?.email})
          </p>
          <p className="text-sm text-gray-500">
            Ajouté le {new Date(field.created_at).toLocaleDateString('fr-FR')}
          </p>
        </div>
        <Badge variant="secondary">
          <Clock className="w-4 h-4 mr-1" />
          Actif
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
        <div><strong>Type :</strong> {field.field_type}</div>
        <div><strong>Capacité :</strong> {field.capacity} personnes</div>
        <div><strong>Prix :</strong> {field.price_per_hour}€/h</div>
      </div>

      {field.description && (
        <div>
          <strong>Description :</strong> {field.description}
        </div>
      )}

      <div className="flex space-x-2">
        <Button 
          onClick={() => onApprove(field.id)}
          disabled={isApproving}
          className="bg-green-600 hover:bg-green-700"
        >
          <CheckCircle className="w-4 h-4 mr-2" />
          Approuver
        </Button>
        
        <Button variant="outline">
          <Eye className="w-4 h-4 mr-2" />
          Voir les détails
        </Button>
      </div>
    </div>
  );
};
