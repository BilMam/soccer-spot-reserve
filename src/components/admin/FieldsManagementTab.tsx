
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FieldCard } from './FieldCard';
import { useFieldsManagement } from '@/hooks/useFieldsManagement';

interface FieldsManagementTabProps {
  hasAdminPermissions: boolean;
}

export const FieldsManagementTab: React.FC<FieldsManagementTabProps> = ({ hasAdminPermissions }) => {
  const {
    fields,
    loadingFields,
    approveFieldMutation
  } = useFieldsManagement(hasAdminPermissions);

  const handleApprove = (fieldId: string) => {
    approveFieldMutation.mutate({ fieldId });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Terrains</CardTitle>
      </CardHeader>
      <CardContent>
        {loadingFields ? (
          <div className="text-center py-8">Chargement...</div>
        ) : !fields || fields.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            Aucun terrain trouvé
          </div>
        ) : (
          <div className="space-y-4">
            {fields.map((field) => (
              <FieldCard
                key={field.id}
                field={field}
                onApprove={handleApprove}
                isApproving={approveFieldMutation.isPending}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
