
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

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

interface OwnerStatsProps {
  stats: OwnerStat[] | undefined;
  isLoading: boolean;
}

const OwnerStats = ({ stats, isLoading }: OwnerStatsProps) => {
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

  if (!stats || stats.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-gray-500">Aucune donnée statistique disponible pour le moment.</p>
        </CardContent>
      </Card>
    );
  }

  // Données pour le graphique des revenus par terrain
  const revenueData = stats.map(stat => ({
    name: stat.field_name,
    revenue: Number(stat.total_revenue),
    bookings: stat.confirmed_bookings
  }));

  // Données pour le graphique des réservations par statut
  const totalConfirmed = stats.reduce((sum, stat) => sum + stat.confirmed_bookings, 0);
  const totalPending = stats.reduce((sum, stat) => sum + stat.pending_bookings, 0);
  
  const bookingStatusData = [
    { name: 'Confirmées', value: totalConfirmed, color: '#10B981' },
    { name: 'En attente', value: totalPending, color: '#F59E0B' }
  ];

  return (
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
              <YAxis />
              <Tooltip 
                formatter={(value: number) => [`${value}€`, 'Revenus']}
                labelFormatter={(label) => `Terrain: ${label}`}
              />
              <Bar dataKey="revenue" fill="#10B981" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Graphique des réservations par statut */}
      <Card>
        <CardHeader>
          <CardTitle>Répartition des réservations</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={bookingStatusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {bookingStatusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Tableau de performance par terrain */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Performance par terrain</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Terrain</th>
                  <th className="text-right p-2">Réservations</th>
                  <th className="text-right p-2">Revenus</th>
                  <th className="text-right p-2">Note</th>
                  <th className="text-right p-2">Avis</th>
                </tr>
              </thead>
              <tbody>
                {stats.map((stat) => (
                  <tr key={stat.field_id} className="border-b">
                    <td className="p-2 font-medium">{stat.field_name}</td>
                    <td className="p-2 text-right">
                      <span className="text-green-600 font-medium">{stat.confirmed_bookings}</span>
                      {stat.pending_bookings > 0 && (
                        <span className="text-yellow-600 ml-1">+{stat.pending_bookings}</span>
                      )}
                    </td>
                    <td className="p-2 text-right font-medium">{Number(stat.total_revenue).toFixed(0)}€</td>
                    <td className="p-2 text-right">
                      <div className="flex items-center justify-end">
                        <span className="text-yellow-500 mr-1">★</span>
                        {Number(stat.avg_rating).toFixed(1)}
                      </div>
                    </td>
                    <td className="p-2 text-right text-gray-600">{stat.total_reviews}</td>
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
