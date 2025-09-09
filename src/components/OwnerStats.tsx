
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { formatXOF } from '@/lib/utils';
import { Calendar, TrendingUp, Users } from 'lucide-react';

interface OwnerStat {
  field_id: string;
  field_name: string;
  total_bookings: number;
  confirmed_bookings: number;
  pending_bookings: number;
  total_revenue: number;
  avg_rating: number;
  total_reviews: number;
}

export type TimeFilter = 'day' | 'week' | 'month';

interface OwnerStatsProps {
  stats: OwnerStat[] | undefined;
  isLoading: boolean;
  timeFilter: TimeFilter;
  onTimeFilterChange: (filter: TimeFilter) => void;
}

const OwnerStats = ({ stats, isLoading, timeFilter, onTimeFilterChange }: OwnerStatsProps) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                <div className="h-32 bg-gray-200 rounded"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Filtres temporels
  const timeFilterLabels = {
    day: 'Aujourd\'hui',
    week: '7 derniers jours', 
    month: '30 derniers jours'
  };

  if (!stats || stats.length === 0) {
    return (
      <div className="space-y-6">
        {/* Filtres temporels */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Statistiques des revenus
              </CardTitle>
              <div className="flex gap-2">
                {(Object.keys(timeFilterLabels) as TimeFilter[]).map((filter) => (
                  <Button
                    key={filter}
                    variant={timeFilter === filter ? "default" : "outline"}
                    size="sm"
                    onClick={() => onTimeFilterChange(filter)}
                  >
                    {timeFilterLabels[filter]}
                  </Button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6 text-center">
            <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Aucune réservation confirmée pour la période sélectionnée.</p>
            <p className="text-sm text-gray-400 mt-2">Les statistiques apparaîtront une fois que vous aurez des réservations payées.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Calculs des totaux
  const totalRevenue = stats.reduce((sum, stat) => sum + Number(stat.total_revenue), 0);
  const totalBookings = stats.reduce((sum, stat) => sum + stat.confirmed_bookings, 0);
  const avgRating = stats.length > 0 ? 
    stats.reduce((sum, stat) => sum + Number(stat.avg_rating), 0) / stats.length : 0;

  // Données pour le graphique des revenus par terrain
  const revenueData = stats.map(stat => ({
    name: stat.field_name,
    revenue: Number(stat.total_revenue),
    bookings: stat.confirmed_bookings
  }));

  // Données simplifiées pour le graphique (plus de pending)
  const bookingStatusData = [
    { name: 'Confirmées & Payées', value: totalBookings, color: '#10B981' }
  ];

  return (
    <div className="space-y-6">
      {/* Filtres temporels et résumé */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <Card className="lg:col-span-4">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Statistiques des revenus - {timeFilterLabels[timeFilter]}
              </CardTitle>
              <div className="flex gap-2">
                {(Object.keys(timeFilterLabels) as TimeFilter[]).map((filter) => (
                  <Button
                    key={filter}
                    variant={timeFilter === filter ? "default" : "outline"}
                    size="sm"
                    onClick={() => onTimeFilterChange(filter)}
                  >
                    {timeFilterLabels[filter]}
                  </Button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  <span className="text-sm font-medium text-green-700">Revenus totaux</span>
                </div>
                <div className="text-2xl font-bold text-green-900">
                  {formatXOF(totalRevenue)}
                </div>
              </div>
              
              <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  <span className="text-sm font-medium text-blue-700">Réservations payées</span>
                </div>
                <div className="text-2xl font-bold text-blue-900">
                  {totalBookings}
                </div>
              </div>
              
              <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-yellow-500 text-lg">★</span>
                  <span className="text-sm font-medium text-yellow-700">Note moyenne</span>
                </div>
                <div className="text-2xl font-bold text-yellow-900">
                  {avgRating.toFixed(1)}/5
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Graphique des revenus par terrain */}
        <Card>
          <CardHeader>
            <CardTitle>Revenus par terrain</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  angle={-45}
                  textAnchor="end"
                  height={100}
                  interval={0}
                  fontSize={12}
                />
                <YAxis 
                  tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip 
                  formatter={(value: number) => [formatXOF(value), 'Revenus']}
                  labelFormatter={(label) => `Terrain: ${label}`}
                />
                <Bar dataKey="revenue" fill="#10B981" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Graphique des réservations confirmées */}
        <Card>
          <CardHeader>
            <CardTitle>Réservations par terrain</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  angle={-45}
                  textAnchor="end"
                  height={100}
                  interval={0}
                  fontSize={12}
                />
                <YAxis />
                <Tooltip 
                  formatter={(value: number) => [`${value}`, 'Réservations']}
                  labelFormatter={(label) => `Terrain: ${label}`}
                />
                <Bar dataKey="bookings" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Tableau de performance par terrain */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Performance détaillée par terrain</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Terrain</th>
                  <th className="text-right p-2">Réservations payées</th>
                  <th className="text-right p-2">Revenus nets</th>
                  <th className="text-right p-2">Note moyenne</th>
                  <th className="text-right p-2">Nombre d'avis</th>
                </tr>
              </thead>
              <tbody>
                {stats.map((stat) => (
                  <tr key={stat.field_id} className="border-b hover:bg-gray-50">
                    <td className="p-2 font-medium">{stat.field_name}</td>
                    <td className="p-2 text-right">
                      <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-sm font-medium">
                        {stat.confirmed_bookings}
                      </span>
                    </td>
                    <td className="p-2 text-right font-bold text-green-700">
                      {formatXOF(stat.total_revenue)}
                    </td>
                    <td className="p-2 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <span className="text-yellow-500">★</span>
                        <span className="font-medium">{Number(stat.avg_rating).toFixed(1)}</span>
                      </div>
                    </td>
                    <td className="p-2 text-right text-gray-600">
                      {stat.total_reviews}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OwnerStats;
