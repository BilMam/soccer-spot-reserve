
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ApplicationCard } from './ApplicationCard';
import { useOwnerApplications } from '@/hooks/useOwnerApplications';

interface OwnerApplicationsTabProps {
  hasAdminPermissions: boolean;
}

export const OwnerApplicationsTab: React.FC<OwnerApplicationsTabProps> = ({ hasAdminPermissions }) => {
  const {
    applications,
    loadingApplications,
    approveApplicationMutation,
    rejectApplicationMutation
  } = useOwnerApplications(hasAdminPermissions);

  const handleApprove = (applicationId: string) => {
    approveApplicationMutation.mutate(applicationId);
  };

  const handleReject = (applicationId: string, notes: string) => {
    rejectApplicationMutation.mutate({ applicationId, notes });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Demandes de propriétaires</CardTitle>
      </CardHeader>
      <CardContent>
        {loadingApplications ? (
          <div className="text-center py-8">Chargement...</div>
        ) : !applications || applications.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            Aucune demande de propriétaire en attente
          </div>
        ) : (
          <div className="space-y-4">
            {applications.map((application) => (
              <ApplicationCard
                key={application.id}
                application={application}
                onApprove={handleApprove}
                onReject={handleReject}
                isApproving={approveApplicationMutation.isPending}
                isRejecting={rejectApplicationMutation.isPending}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default OwnerApplicationsTab;
