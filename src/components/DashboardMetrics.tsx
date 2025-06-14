
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, BarChart3, Calendar, Star, TrendingUp, Euro } from 'lucide-react';

interface MetricsProps {
  totalFields: number;
  activeFields: number;
  totalRevenue: number;
  totalBookings: number;
  avgRating: number;
  pendingBookings: number;
}

const DashboardMetrics = ({ 
  totalFields, 
  activeFields, 
  totalRevenue, 
  totalBookings, 
  avgRating,
  pendingBookings 
}: MetricsProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-blue-700">Terrains totaux</CardTitle>
          <MapPin className="w-4 h-4 text-blue-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-900">{totalFields}</div>
          <p className="text-xs text-blue-600">
            {activeFields} actifs
          </p>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-200">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-green-700">Chiffre d'affaires</CardTitle>
          <Euro className="w-4 h-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-900">{totalRevenue.toFixed(0)}€</div>
          <p className="text-xs text-green-600">Total généré</p>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-purple-700">Réservations</CardTitle>
          <Calendar className="w-4 h-4 text-purple-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-purple-900">{totalBookings}</div>
          <p className="text-xs text-purple-600">Confirmées</p>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-r from-yellow-50 to-yellow-100 border-yellow-200">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-yellow-700">Note moyenne</CardTitle>
          <Star className="w-4 h-4 text-yellow-600 fill-current" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-yellow-900">{avgRating.toFixed(1)}</div>
          <p className="text-xs text-yellow-600">Sur 5 étoiles</p>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-r from-orange-50 to-orange-100 border-orange-200">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-orange-700">En attente</CardTitle>
          <TrendingUp className="w-4 h-4 text-orange-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-orange-900">{pendingBookings}</div>
          <p className="text-xs text-orange-600">Réservations</p>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-r from-indigo-50 to-indigo-100 border-indigo-200">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-indigo-700">Taux d'occupation</CardTitle>
          <BarChart3 className="w-4 h-4 text-indigo-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-indigo-900">
            {totalFields > 0 ? Math.round((totalBookings / (totalFields * 30)) * 100) : 0}%
          </div>
          <p className="text-xs text-indigo-600">Ce mois</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardMetrics;
