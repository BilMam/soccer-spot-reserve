
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { XCircle } from 'lucide-react';
import type { OwnerApplication } from '@/types/admin';

interface RejectApplicationDialogProps {
  application: OwnerApplication;
  onReject: (id: string, notes: string) => void;
  isRejecting: boolean;
}

export const RejectApplicationDialog: React.FC<RejectApplicationDialogProps> = ({
  application,
  onReject,
  isRejecting
}) => {
  const [reviewNotes, setReviewNotes] = useState('');
  const [open, setOpen] = useState(false);

  const handleReject = () => {
    onReject(application.id, reviewNotes);
    setReviewNotes('');
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive">
          <XCircle className="w-4 h-4 mr-2" />
          Rejeter
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rejeter la demande</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p>Êtes-vous sûr de vouloir rejeter la demande de {application.full_name} ?</p>
          <Textarea
            placeholder="Raison du rejet (optionnel)"
            value={reviewNotes}
            onChange={(e) => setReviewNotes(e.target.value)}
          />
          <div className="flex space-x-2">
            <Button 
              variant="destructive"
              onClick={handleReject}
              disabled={isRejecting}
            >
              Confirmer le rejet
            </Button>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
