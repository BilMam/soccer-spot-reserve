import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle, Eye, Clock, XCircle } from 'lucide-react';
import type { Field } from '@/types/admin';
import { FieldDetailDialog } from './FieldDetailDialog';

interface FieldCardProps {
  field: Field;
  onApprove: (id: string) => void;
  onReject: (id: string, reason: string) => void;
  isApproving: boolean;
  isRejecting: boolean;
}

export const FieldCard: React.FC<FieldCardProps> = ({ 
  field, 
  onApprove, 
  onReject, 
  isApproving,
  isRejecting 
}) => {
  const [rejectReason, setRejectReason] = useState('');
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  const handleReject = () => {
    if (rejectReason.trim()) {
      onReject(field.id, rejectReason);
      setRejectReason('');
      setRejectDialogOpen(false);
    }
  };

  const getStatusBadge = () => {
    if (field.is_active) {
      return (
        <Badge variant="default" className="bg-green-100 text-green-800">
          <CheckCircle className="w-4 h-4 mr-1" />
          Actif
        </Badge>
      );
    } else {
      return (
        <Badge variant="destructive">
          <XCircle className="w-4 h-4 mr-1" />
          Inactif
        </Badge>
      );
    }
  };

  return (
    <>
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
          {getStatusBadge()}
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
          {field.is_active ? (
            <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="destructive">
                  <XCircle className="w-4 h-4 mr-2" />
                  Désactiver
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Désactiver le terrain</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <p>Êtes-vous sûr de vouloir désactiver ce terrain ?</p>
                  <Textarea
                    placeholder="Raison de la désactivation"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    required
                  />
                  <div className="flex space-x-2">
                    <Button 
                      variant="destructive"
                      onClick={handleReject}
                      disabled={isRejecting || !rejectReason.trim()}
                    >
                      Confirmer la désactivation
                    </Button>
                    <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
                      Annuler
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          ) : (
            <Button 
              onClick={() => onApprove(field.id)}
              disabled={isApproving}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Approuver
            </Button>
          )}
          
          <Button 
            variant="outline"
            onClick={() => setDetailDialogOpen(true)}
          >
            <Eye className="w-4 h-4 mr-2" />
            Voir les détails
          </Button>
        </div>
      </div>

      <FieldDetailDialog
        field={field}
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
      />
    </>
  );
};
