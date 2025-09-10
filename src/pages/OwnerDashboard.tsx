
import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import OwnerStats from '@/components/OwnerStats';
import OwnerFields from '@/components/OwnerFields';
import OwnerBookings from '@/components/OwnerBookings';
import PaymentOnboarding from '@/components/PaymentOnboarding';
import AvailabilityManagement from '@/components/availability/AvailabilityManagement';
import { PayoutAccountsManager } from '@/components/owner/PayoutAccountsManager';
import { usePermissions } from '@/hooks/usePermissions';
import { useOwnerStats, TimeFilterConfig } from '@/hooks/useOwnerStats';
import { useOwnerFields } from '@/hooks/useOwnerFields';
import { ViewMode } from '@/components/OwnerStats';
import { Calendar } from 'lucide-react';

const OwnerDashboard = () => {
  const { user, loading } = useAuth();
  const { isOwner, loading: permissionsLoading } = usePermissions();
  const [timeFilter, setTimeFilter] = useState<TimeFilterConfig>({ 
    type: 'last30days', 
    label: '30 derniers jours' 
  });
  const [viewMode, setViewMode] = useState<ViewMode>('global');
  const [selectedFieldId, setSelectedFieldId] = useState<string>('');
  
  const { data: statsResponse, isLoading: statsLoading } = useOwnerStats(
    timeFilter, 
    viewMode === 'field' ? selectedFieldId : undefined
  );
  const { data: fields, isLoading: fieldsLoading } = useOwnerFields();
  
  // Adapter la réponse du hook
  const stats = statsResponse?.stats;
  const bookingDetails = statsResponse?.bookingDetails;

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

  const selectedField = fields?.find(field => field.id === selectedFieldId);

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
            <TabsTrigger value="availability">Gestion créneaux</TabsTrigger>
            <TabsTrigger value="bookings">Réservations</TabsTrigger>
            <TabsTrigger value="payments">Paiements</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="space-y-6">
              <OwnerStats 
                stats={stats} 
                isLoading={statsLoading} 
                timeFilter={timeFilter}
                onTimeFilterChange={setTimeFilter}
                fields={fields?.map(f => ({ id: f.id, name: f.name, location: f.location }))}
                bookingDetails={bookingDetails}
                viewMode={viewMode}
                selectedFieldId={selectedFieldId}
                onViewModeChange={setViewMode}
                onFieldSelect={setSelectedFieldId}
              />
            </div>
          </TabsContent>

          <TabsContent value="fields">
            <OwnerFields fields={fields} isLoading={fieldsLoading} />
          </TabsContent>

          <TabsContent value="availability">
            <div className="space-y-6">
              <div className="flex items-center gap-4 mb-6">
                <h2 className="text-xl font-semibold">Gestion des créneaux</h2>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Terrain :</span>
                  <Select value={selectedFieldId} onValueChange={setSelectedFieldId}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Sélectionner..." />
                    </SelectTrigger>
                    <SelectContent>
                      {fields && fields.length > 0 ? (
                        fields.map((field) => (
                          <SelectItem key={field.id} value={field.id}>
                            {field.name}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="no-fields" disabled>
                          Aucun terrain disponible
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {selectedFieldId ? (
                <AvailabilityManagement
                  fieldId={selectedFieldId}
                  fieldName={selectedField?.name || 'Terrain'}
                />
              ) : (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Calendar className="w-16 h-16 text-gray-400 mb-4" />
                    <h3 className="text-xl font-medium text-gray-600 mb-2">
                      Sélectionnez un terrain
                    </h3>
                    <p className="text-gray-500 text-center max-w-md">
                      Choisissez le terrain dont vous souhaitez gérer les créneaux 
                      de disponibilité dans le sélecteur ci-dessus.
                    </p>
                    {(!fields || fields.length === 0) && (
                      <p className="text-sm text-orange-600 mt-4">
                        Vous devez d'abord ajouter un terrain dans l'onglet "Mes terrains".
                      </p>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="bookings">
            <OwnerBookings ownerId={user.id} />
          </TabsContent>

          <TabsContent value="payments">
            <div className="space-y-6">
              <PayoutAccountsManager />
              
              <div className="bg-white rounded-lg border p-6">
                <h3 className="text-lg font-medium mb-4">Informations sur les revenus</h3>
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
                      <li>• Wave, Orange Money, MTN Money, Moov Money</li>
                      <li>• Cartes Visa, Mastercard</li>
                      <li>• Virements bancaires locaux</li>
                      <li>• Commission de paiement : ~2.5%</li>
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
