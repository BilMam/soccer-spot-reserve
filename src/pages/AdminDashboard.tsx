
import React from 'react';
import Navbar from '@/components/Navbar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, MapPin } from 'lucide-react';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';
import { OwnerApplicationsTab } from '@/components/admin/OwnerApplicationsTab';
import { FieldsManagementTab } from '@/components/admin/FieldsManagementTab';

const AdminDashboard = () => {
  const { user, hasAdminPermissions } = useAdminPermissions();

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container mx-auto px-4 py-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Accès non autorisé</h1>
          <p className="text-gray-600">Vous devez être connecté pour accéder à cette page.</p>
        </div>
      </div>
    );
  }

  if (!hasAdminPermissions) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container mx-auto px-4 py-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Accès interdit</h1>
          <p className="text-gray-600">Vous n'avez pas les permissions pour accéder à cette page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard Administrateur</h1>
          <p className="text-gray-600 mt-2">Gérez les demandes de propriétaires et la validation des terrains</p>
        </div>

        <Tabs defaultValue="applications" className="space-y-6">
          <TabsList>
            <TabsTrigger value="applications" className="flex items-center space-x-2">
              <Users className="w-4 h-4" />
              <span>Demandes de propriétaires</span>
            </TabsTrigger>
            <TabsTrigger value="fields" className="flex items-center space-x-2">
              <MapPin className="w-4 h-4" />
              <span>Terrains</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="applications">
            <OwnerApplicationsTab hasAdminPermissions={hasAdminPermissions} />
          </TabsContent>

          <TabsContent value="fields">
            <FieldsManagementTab hasAdminPermissions={hasAdminPermissions} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;
