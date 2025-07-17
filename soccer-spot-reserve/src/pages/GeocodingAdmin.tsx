
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import GeocodingDashboard from '@/components/admin/GeocodingDashboard';
import FieldAddressCorrection from '@/components/admin/FieldAddressCorrection';
import { MapPin, Settings, List } from 'lucide-react';

const GeocodingAdmin: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Administration du géocodage</h1>
        <p className="text-gray-600">
          Gérez les coordonnées GPS des terrains et corrigez les adresses
        </p>
      </div>

      <Tabs defaultValue="dashboard" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="dashboard" className="flex items-center space-x-2">
            <MapPin className="w-4 h-4" />
            <span>Dashboard</span>
          </TabsTrigger>
          <TabsTrigger value="correction" className="flex items-center space-x-2">
            <Settings className="w-4 h-4" />
            <span>Correction d'adresses</span>
          </TabsTrigger>
          <TabsTrigger value="bulk" className="flex items-center space-x-2">
            <List className="w-4 h-4" />
            <span>Géocodage en masse</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <GeocodingDashboard />
        </TabsContent>

        <TabsContent value="correction">
          <FieldAddressCorrection />
        </TabsContent>

        <TabsContent value="bulk">
          <div className="text-center py-12">
            <MapPin className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Géocodage en masse</h3>
            <p className="text-gray-600">
              Utilisez l'onglet Dashboard pour lancer le géocodage de tous les terrains
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default GeocodingAdmin;
