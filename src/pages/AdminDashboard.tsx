
import React from 'react';
import Navbar from '@/components/Navbar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, MapPin, BarChart3, Map } from 'lucide-react';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';
import OwnerApplicationsTab from '@/components/admin/OwnerApplicationsTab';
import { OwnersPendingTab } from '@/components/admin/OwnersPendingTab';
import { FieldsManagementTab } from '@/components/admin/FieldsManagementTab';
import { AdminStats } from '@/components/admin/AdminStats';
import GeocodingDashboard from '@/components/admin/GeocodingDashboard';
import FieldAddressCorrection from '@/components/admin/FieldAddressCorrection';

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

        <AdminStats hasAdminPermissions={hasAdminPermissions} />

        <Tabs defaultValue="applications" className="space-y-6">
          <TabsList>
            <TabsTrigger value="applications" className="flex items-center space-x-2">
              <Users className="w-4 h-4" />
              <span>Demandes de propriétaires</span>
            </TabsTrigger>
            <TabsTrigger value="pending-owners" className="flex items-center space-x-2">
              <Users className="w-4 h-4" />
              <span>Propriétaires (CinetPay)</span>
            </TabsTrigger>
            <TabsTrigger value="fields" className="flex items-center space-x-2">
              <MapPin className="w-4 h-4" />
              <span>Terrains</span>
            </TabsTrigger>
            <TabsTrigger value="geocoding" className="flex items-center space-x-2">
              <Map className="w-4 h-4" />
              <span>Géocodage</span>
            </TabsTrigger>
            <TabsTrigger value="stats" className="flex items-center space-x-2">
              <BarChart3 className="w-4 h-4" />
              <span>Statistiques</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="applications">
            <OwnerApplicationsTab hasAdminPermissions={hasAdminPermissions} />
          </TabsContent>

          <TabsContent value="pending-owners">
            <OwnersPendingTab hasAdminPermissions={hasAdminPermissions} />
          </TabsContent>

          <TabsContent value="fields">
            <FieldsManagementTab hasAdminPermissions={hasAdminPermissions} />
          </TabsContent>

          <TabsContent value="geocoding">
            <div className="space-y-6">
              <div className="mb-6">
                <h2 className="text-2xl font-bold mb-2">Administration du géocodage</h2>
                <p className="text-gray-600">
                  Gérez les coordonnées GPS des terrains et corrigez les adresses
                </p>
              </div>

              <Tabs defaultValue="dashboard" className="space-y-4">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="dashboard" className="flex items-center space-x-2">
                    <MapPin className="w-4 h-4" />
                    <span>Dashboard</span>
                  </TabsTrigger>
                  <TabsTrigger value="correction" className="flex items-center space-x-2">
                    <Map className="w-4 h-4" />
                    <span>Correction d'adresses</span>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="dashboard">
                  <GeocodingDashboard />
                </TabsContent>

                <TabsContent value="correction">
                  <FieldAddressCorrection />
                </TabsContent>
              </Tabs>
            </div>
          </TabsContent>

          <TabsContent value="stats">
            <div className="text-center py-8 text-gray-500">
              Statistiques détaillées à venir...
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;
