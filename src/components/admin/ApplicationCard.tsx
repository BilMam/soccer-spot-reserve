
import React from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle } from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import { RejectApplicationDialog } from './RejectApplicationDialog';
import type { OwnerApplication } from '@/types/admin';

interface ApplicationCardProps {
  application: OwnerApplication;
  onApprove: (id: string) => void;
  onReject: (id: string, notes: string) => void;
  isApproving: boolean;
  isRejecting: boolean;
}

export const ApplicationCard: React.FC<ApplicationCardProps> = ({
  application,
  onApprove,
  onReject,
  isApproving,
  isRejecting
}) => {
  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-semibold text-lg">{application.full_name}</h3>
          <p className="text-gray-600">{application.user_email}</p>
          <p className="text-sm text-gray-500">
            Demande soumise le {new Date(application.created_at).toLocaleDateString('fr-FR')}
          </p>
        </div>
        <StatusBadge status={application.status} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        <div>
          <strong>Téléphone :</strong> {application.phone}
        </div>
        {application.experience && (
          <div>
            <strong>Expérience :</strong> {application.experience}
          </div>
        )}
        {application.motivation && (
          <div className="col-span-2">
            <strong>Motivation :</strong> {application.motivation}
          </div>
        )}
      </div>

      {application.admin_notes && (
        <div className="bg-gray-50 p-3 rounded">
          <strong>Notes admin :</strong> {application.admin_notes}
        </div>
      )}

      {application.status === 'pending' && (
        <div className="flex space-x-2">
          <Button 
            onClick={() => onApprove(application.id)}
            disabled={isApproving}
            className="bg-green-600 hover:bg-green-700"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Approuver
          </Button>
          
          <RejectApplicationDialog
            application={application}
            onReject={onReject}
            isRejecting={isRejecting}
          />
        </div>
      )}
    </div>
  );
};
