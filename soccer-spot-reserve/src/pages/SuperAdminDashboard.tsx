
import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import Navbar from '@/components/Navbar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Crown, Users, History } from 'lucide-react';
import { UserManagementTab } from '@/components/super-admin/UserManagementTab';
import { AuditLogsTab } from '@/components/super-admin/AuditLogsTab';

const SuperAdminDashboard = () => {
  const { user } = useAuth();
  const { isSuperAdmin } = usePermissions();

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

  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container mx-auto px-4 py-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Accès interdit</h1>
          <p className="text-gray-600">Seuls les Super Admins peuvent accéder à cette page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <Crown className="w-8 h-8 text-red-600" />
            <h1 className="text-3xl font-bold text-gray-900">Super Admin Dashboard</h1>
          </div>
          <p className="text-gray-600">Gestion complète des utilisateurs et des rôles du système</p>
        </div>

        <Tabs defaultValue="users" className="space-y-6">
          <TabsList>
            <TabsTrigger value="users" className="flex items-center space-x-2">
              <Users className="w-4 h-4" />
              <span>Gestion des Utilisateurs</span>
            </TabsTrigger>
            <TabsTrigger value="audit" className="flex items-center space-x-2">
              <History className="w-4 h-4" />
              <span>Logs d'Audit</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <UserManagementTab isSuperAdmin={isSuperAdmin} />
          </TabsContent>

          <TabsContent value="audit">
            <AuditLogsTab isSuperAdmin={isSuperAdmin} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default SuperAdminDashboard;
