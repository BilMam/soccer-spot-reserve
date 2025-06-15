
import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import OwnerStats from '@/components/OwnerStats';
import OwnerFields from '@/components/OwnerFields';
import OwnerBookings from '@/components/OwnerBookings';
import CinetPayOnboarding from '@/components/CinetPayOnboarding';
import { usePermissions } from '@/hooks/usePermissions';
import { useOwnerStats } from '@/hooks/useOwnerStats';
import { useOwnerFields } from '@/hooks/useOwnerFields';

const OwnerDashboard = () => {
  const { user, loading } = useAuth();
  const { isOwner, loading: permissionsLoading } = usePermissions();
  const { data: stats, isLoading: statsLoading } = useOwnerStats();
  const { data: fields, isLoading: fieldsLoading } = useOwnerFields();

  if (loading || permissionsLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-8">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-32 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user || !isOwner) {
    return <Navigate to="/become-owner" replace />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Tableau de bord propriétaire
          </h1>
          <p className="text-gray-600">
            Gérez vos terrains et suivez vos revenus
          </p>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
            <TabsTrigger value="fields">Mes terrains</TabsTrigger>
            <TabsTrigger value="bookings">Réservations</TabsTrigger>
            <TabsTrigger value="payments">Paiements</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="space-y-6">
              <OwnerStats stats={stats} isLoading={statsLoading} />
            </div>
          </TabsContent>

          <TabsContent value="fields">
            <OwnerFields fields={fields} isLoading={fieldsLoading} />
          </TabsContent>

          <TabsContent value="bookings">
            <OwnerBookings ownerId={user.id} />
          </TabsContent>

          <TabsContent value="payments">
            <div className="space-y-6">
              <CinetPayOnboarding />
              
              <div className="bg-white rounded-lg border p-6">
                <h3 className="text-lg font-medium mb-4">Informations sur les revenus CinetPay</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="space-y-2">
                    <h4 className="font-medium">Comment ça fonctionne :</h4>
                    <ul className="space-y-1 text-gray-600">
                      <li>• Paiement direct après chaque réservation</li>
                      <li>• Commission automatique de 5%</li>
                      <li>• Virements en franc CFA (XOF)</li>
                      <li>• Support Mobile Money et cartes bancaires</li>
                      <li>• Revenus nets : ~92.5% du montant total</li>
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium">Moyens de paiement :</h4>
                    <ul className="space-y-1 text-gray-600">
                      <li>• Orange Money, MTN Money, Moov Money</li>
                      <li>• Cartes Visa, Mastercard</li>
                      <li>• Virements bancaires locaux</li>
                      <li>• Commission CinetPay : ~2.5%</li>
                      <li>• Exemple : 10 000 XOF → 9 250 XOF nets</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default OwnerDashboard;
