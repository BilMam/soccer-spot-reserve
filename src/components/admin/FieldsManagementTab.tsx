
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { FieldCard } from './FieldCard';
import { useFieldsManagement } from '@/hooks/useFieldsManagement';

interface FieldsManagementTabProps {
  hasAdminPermissions: boolean;
}

export const FieldsManagementTab: React.FC<FieldsManagementTabProps> = ({ hasAdminPermissions }) => {
  const {
    fields,
    loadingFields,
    approveFieldMutation,
    rejectFieldMutation
  } = useFieldsManagement(hasAdminPermissions);

  const handleApprove = (fieldId: string) => {
    approveFieldMutation.mutate({ fieldId });
  };

  const handleReject = (fieldId: string, reason: string) => {
    rejectFieldMutation.mutate({ fieldId, reason });
  };

  // Filtrer les terrains par statut
  const pendingFields = fields?.filter(field => !field.is_active) || [];
  const activeFields = fields?.filter(field => field.is_active) || [];

  const renderFieldsList = (fieldsList: typeof fields, emptyMessage: string) => {
    if (loadingFields) {
      return <div className="text-center py-8">Chargement...</div>;
    }

    if (!fieldsList || fieldsList.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          {emptyMessage}
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {fieldsList.map((field) => (
          <FieldCard
            key={field.id}
            field={field}
            onApprove={handleApprove}
            onReject={handleReject}
            isApproving={approveFieldMutation.isPending}
            isRejecting={rejectFieldMutation.isPending}
          />
        ))}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Gestion des terrains
          <div className="flex space-x-2">
            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
              {pendingFields.length} en attente
            </Badge>
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
              {activeFields.length} approuvés
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="pending" className="space-y-4">
          <TabsList>
            <TabsTrigger value="pending" className="flex items-center space-x-2">
              <span>En attente d'approbation</span>
              {pendingFields.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {pendingFields.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="active">
              Terrains approuvés
            </TabsTrigger>
            <TabsTrigger value="all">
              Tous les terrains
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending">
            {renderFieldsList(
              pendingFields,
              "Aucun terrain en attente d'approbation"
            )}
          </TabsContent>

          <TabsContent value="active">
            {renderFieldsList(
              activeFields,
              "Aucun terrain approuvé"
            )}
          </TabsContent>

          <TabsContent value="all">
            {renderFieldsList(
              fields,
              "Aucun terrain trouvé"
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
