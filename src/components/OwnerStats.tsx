import React, { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { formatXOF } from '@/lib/utils';
import { Calendar, TrendingUp, Users, ArrowLeft, MapPin, Star, ChevronDown, ChevronUp, X } from 'lucide-react';
import TimeFilterSelector from './TimeFilterSelector';
import { TimeFilterConfig } from '@/hooks/useOwnerStats';
import { format, parseISO, startOfDay, eachDayOfInterval, eachMonthOfInterval, startOfMonth } from 'date-fns';
import { fr } from 'date-fns/locale';

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

export type ViewMode = 'global' | 'field';

interface Field {
  id: string;
  name: string;
  location?: string;
}

interface BookingDetail {
  id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  total_price: number;
  owner_amount: number;
  status: string;
  created_at: string;
}

interface OwnerStatsProps {
  stats: OwnerStat[] | undefined;
  isLoading: boolean;
  timeFilter: TimeFilterConfig;
  onTimeFilterChange: (filter: TimeFilterConfig) => void;
  fields?: Field[];
  bookingDetails?: BookingDetail[] | null;
  viewMode: ViewMode;
  selectedFieldId?: string;
  onViewModeChange: (mode: ViewMode) => void;
  onFieldSelect: (fieldId: string) => void;
}

// Custom dot component for the LineChart
const CustomDot = (props: any) => {
  const { cx, cy, payload, selectedDate } = props;
  const isSelected = payload?.date === selectedDate;
  
  return (
    <circle
      cx={cx}
      cy={cy}
      r={isSelected ? 8 : 4}
      fill={isSelected ? '#F59E0B' : '#10B981'}
      stroke={isSelected ? '#D97706' : '#10B981'}
      strokeWidth={isSelected ? 3 : 2}
      style={{ cursor: 'pointer' }}
    />
  );
};

const OwnerStats = ({ 
  stats, 
  isLoading, 
  timeFilter, 
  onTimeFilterChange, 
  fields, 
  bookingDetails,
  viewMode,
  selectedFieldId,
  onViewModeChange,
  onFieldSelect 
}: OwnerStatsProps) => {
  const [showAllBookings, setShowAllBookings] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const selectedField = fields?.find(f => f.id === selectedFieldId);
  const isFieldView = viewMode === 'field' && selectedFieldId;

  // Reset selectedDate when field or view changes
  const handleViewModeChange = useCallback((mode: ViewMode) => {
    setSelectedDate(null);
    onViewModeChange(mode);
  }, [onViewModeChange]);

  const handleFieldSelect = useCallback((fieldId: string) => {
    setSelectedDate(null);
    onFieldSelect(fieldId);
  }, [onFieldSelect]);

  // Créer les données temporelles pour les graphiques
  const timeSeriesData = useMemo(() => {
    if (!bookingDetails || !isFieldView) return [];
    
    const groupedByDate = bookingDetails.reduce((acc, booking) => {
      const date = booking.booking_date;
      if (!acc[date]) {
        acc[date] = { revenue: 0, bookings: 0 };
      }
      acc[date].revenue += Number(booking.owner_amount);
      acc[date].bookings += 1;
      return acc;
    }, {} as Record<string, { revenue: number; bookings: number }>);

    return Object.entries(groupedByDate)
      .map(([date, data]) => ({
        date,
        revenue: data.revenue,
        bookings: data.bookings,
        formattedDate: format(parseISO(date), 'dd/MM', { locale: fr })
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [bookingDetails, isFieldView]);

  // Données pour les créneaux horaires - filtrées par jour sélectionné si applicable
  const timeSlotData = useMemo(() => {
    if (!bookingDetails || !isFieldView) return [];
    
    const filteredBookings = selectedDate
      ? bookingDetails.filter(b => b.booking_date === selectedDate)
      : bookingDetails;
    
    const groupedByTime = filteredBookings.reduce((acc, booking) => {
      const timeSlot = `${booking.start_time.substring(0, 5)}-${booking.end_time.substring(0, 5)}`;
      if (!acc[timeSlot]) {
        acc[timeSlot] = { count: 0, revenue: 0 };
      }
      acc[timeSlot].count += 1;
      acc[timeSlot].revenue += Number(booking.owner_amount);
      return acc;
    }, {} as Record<string, { count: number; revenue: number }>);

    return Object.entries(groupedByTime)
      .map(([timeSlot, data]) => ({
        timeSlot,
        count: data.count,
        revenue: data.revenue
      }))
      .sort((a, b) => a.timeSlot.localeCompare(b.timeSlot));
  }, [bookingDetails, isFieldView, selectedDate]);

  // Détails du jour sélectionné
  const selectedDayBookings = useMemo(() => {
    if (!bookingDetails || !selectedDate) return [];
    return bookingDetails
      .filter(b => b.booking_date === selectedDate)
      .sort((a, b) => a.start_time.localeCompare(b.start_time));
  }, [bookingDetails, selectedDate]);

  const selectedDayTotals = useMemo(() => {
    return {
      totalPrice: selectedDayBookings.reduce((sum, b) => sum + b.total_price, 0),
      ownerAmount: selectedDayBookings.reduce((sum, b) => sum + b.owner_amount, 0),
      count: selectedDayBookings.length
    };
  }, [selectedDayBookings]);

  // Handler pour le clic sur un point du graphique
  const handleChartClick = useCallback((data: any) => {
    if (data?.activePayload?.[0]?.payload?.date) {
      const clickedDate = data.activePayload[0].payload.date;
      setSelectedDate(prev => prev === clickedDate ? null : clickedDate);
    }
  }, []);

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
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Statistiques des revenus
                  {isFieldView && selectedField && (
                    <Badge variant="secondary" className="ml-2">
                      {selectedField.name}
                    </Badge>
                  )}
                </CardTitle>
              </div>

              <div className="flex flex-col gap-3">
                <TimeFilterSelector
                  currentFilter={timeFilter}
                  onFilterChange={onTimeFilterChange}
                />
              </div>

              <div className="flex items-center gap-4">
                <div className="flex gap-2">
                  <Button
                    variant={viewMode === 'global' ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleViewModeChange('global')}
                  >
                    Vue globale
                  </Button>
                  <Button
                    variant={viewMode === 'field' ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleViewModeChange('field')}
                  >
                    Par terrain
                  </Button>
                </div>

                {viewMode === 'field' && fields && fields.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Terrain :</span>
                    <Select value={selectedFieldId || ''} onValueChange={handleFieldSelect}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Sélectionner un terrain..." />
                      </SelectTrigger>
                      <SelectContent className="bg-white">
                        {fields.map((field) => (
                          <SelectItem key={field.id} value={field.id}>
                            {field.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6 text-center">
            <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">
              {isFieldView 
                ? `Aucune réservation pour ${selectedField?.name || 'ce terrain'} sur la période sélectionnée.`
                : 'Aucune réservation pour la période sélectionnée.'
              }
            </p>
            <p className="text-sm text-gray-400 mt-2">Les statistiques apparaîtront une fois que vous aurez des réservations.</p>
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

  return (
    <div className="space-y-6">
      {/* En-tête avec contrôles */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  {isFieldView ? `Terrain : ${selectedField?.name}` : 'Vue d\'ensemble'}
                </CardTitle>
                {isFieldView && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleViewModeChange('global')}
                    className="flex items-center gap-1"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Retour global
                  </Button>
                )}
              </div>
              <Badge variant="outline">{timeFilter.label}</Badge>
            </div>

            <div className="border-t pt-4">
              <TimeFilterSelector
                currentFilter={timeFilter}
                onFilterChange={onTimeFilterChange}
              />
            </div>

            <div className="flex items-center gap-4 border-t pt-4">
              <div className="flex gap-2">
                <Button
                  variant={viewMode === 'global' ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleViewModeChange('global')}
                >
                  Vue globale
                </Button>
                <Button
                  variant={viewMode === 'field' ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleViewModeChange('field')}
                >
                  Par terrain
                </Button>
              </div>

              {viewMode === 'field' && fields && fields.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Terrain :</span>
                  <Select value={selectedFieldId || ''} onValueChange={handleFieldSelect}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Sélectionner un terrain..." />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      {fields.map((field) => (
                        <SelectItem key={field.id} value={field.id}>
                          {field.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-green-600" />
            <span className="text-sm font-medium text-green-700">
              {isFieldView ? 'Revenus du terrain' : 'Revenus totaux'}
            </span>
          </div>
          <div className="text-2xl font-bold text-green-900">
            {formatXOF(totalRevenue)}
          </div>
          <p className="text-xs text-green-600 mt-1">{timeFilter.label}</p>
        </div>
        
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-medium text-blue-700">Réservations</span>
          </div>
          <div className="text-2xl font-bold text-blue-900">
            {totalBookings}
          </div>
          <p className="text-xs text-blue-600 mt-1">{timeFilter.label}</p>
        </div>
        
        <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Star className="w-5 h-5 text-yellow-500" />
            <span className="text-sm font-medium text-yellow-700">Note moyenne</span>
          </div>
          <div className="text-2xl font-bold text-yellow-900">
            {avgRating.toFixed(1)}/5
          </div>
          <p className="text-xs text-yellow-600 mt-1">Toutes les reviews</p>
        </div>
      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {!isFieldView ? (
          <>
            {/* Vue globale - Revenus par terrain */}
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

            {/* Vue globale - Réservations par terrain */}
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
          </>
        ) : (
          <>
            {/* Vue terrain - Évolution des revenus dans le temps (cliquable) */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Évolution des revenus</CardTitle>
                  {selectedDate && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedDate(null)}
                      className="flex items-center gap-1 text-xs"
                    >
                      <X className="w-3 h-3" />
                      Désélectionner
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {selectedDate
                    ? `📍 Jour sélectionné : ${format(parseISO(selectedDate), 'EEEE d MMMM yyyy', { locale: fr })}`
                    : 'Cliquez sur un point pour voir le détail du jour'
                  }
                </p>
              </CardHeader>
              <CardContent>
                {timeSeriesData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={timeSeriesData} onClick={handleChartClick}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="formattedDate"
                        fontSize={12}
                      />
                      <YAxis 
                        tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                      />
                      <Tooltip 
                        formatter={(value: number) => [formatXOF(value), 'Revenus']}
                        labelFormatter={(label) => `Date: ${label}`}
                      />
                      <Line 
                        dataKey="revenue" 
                        stroke="#10B981" 
                        strokeWidth={2}
                        dot={<CustomDot selectedDate={selectedDate} />}
                        activeDot={{ r: 6, fill: '#F59E0B', stroke: '#D97706', strokeWidth: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-8">
                    <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">Aucune donnée pour la période sélectionnée</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Vue terrain - Créneaux horaires (dynamique selon jour sélectionné) */}
            <Card>
              <CardHeader>
                <CardTitle>
                  {selectedDate
                    ? `Créneaux du ${format(parseISO(selectedDate), 'd MMMM', { locale: fr })}`
                    : 'Créneaux les plus prisés'
                  }
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  {selectedDate
                    ? `Détail des réservations pour cette journée`
                    : 'Sur toute la période sélectionnée'
                  }
                </p>
              </CardHeader>
              <CardContent>
                {timeSlotData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={timeSlotData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="timeSlot"
                        fontSize={12}
                      />
                      <YAxis />
                      <Tooltip 
                        formatter={(value: number, name: string) => {
                          if (name === 'revenue') return [formatXOF(value), 'Revenus'];
                          return [`${value}`, 'Réservations'];
                        }}
                        labelFormatter={(label) => `Créneau: ${label}`}
                      />
                      <Bar dataKey="count" fill="#3B82F6" name="count" />
                      {selectedDate && (
                        <Bar dataKey="revenue" fill="#10B981" name="revenue" />
                      )}
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">
                      {selectedDate 
                        ? 'Aucune réservation ce jour-là'
                        : 'Aucune donnée pour la période sélectionnée'
                      }
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Section détail du jour sélectionné */}
      {isFieldView && selectedDate && selectedDayBookings.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/30">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-amber-600" />
                Détail du {format(parseISO(selectedDate), 'EEEE d MMMM yyyy', { locale: fr })}
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedDate(null)}
                className="flex items-center gap-1"
              >
                <X className="w-4 h-4" />
                Retour à la vue période
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-amber-200">
                    <th className="text-left p-2 text-sm font-medium text-amber-800">Créneau</th>
                    <th className="text-right p-2 text-sm font-medium text-amber-800">Prix total</th>
                    <th className="text-right p-2 text-sm font-medium text-amber-800">Revenus nets</th>
                    <th className="text-center p-2 text-sm font-medium text-amber-800">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedDayBookings.map((booking) => (
                    <tr key={booking.id} className="border-b border-amber-100 hover:bg-amber-50">
                      <td className="p-2 font-medium">
                        {booking.start_time.substring(0, 5)} - {booking.end_time.substring(0, 5)}
                      </td>
                      <td className="p-2 text-right">
                        {formatXOF(booking.total_price)}
                      </td>
                      <td className="p-2 text-right font-bold text-green-700">
                        {formatXOF(booking.owner_amount)}
                      </td>
                      <td className="p-2 text-center">
                        <Badge 
                          variant={booking.status === 'completed' ? 'default' : 'secondary'}
                          className="capitalize text-xs"
                        >
                          {booking.status === 'confirmed' ? 'Confirmé' :
                           booking.status === 'completed' ? 'Terminé' :
                           booking.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-amber-300 bg-amber-50">
                    <td className="p-2 font-bold text-amber-900">
                      Total ({selectedDayTotals.count} réservation{selectedDayTotals.count > 1 ? 's' : ''})
                    </td>
                    <td className="p-2 text-right font-bold text-amber-900">
                      {formatXOF(selectedDayTotals.totalPrice)}
                    </td>
                    <td className="p-2 text-right font-bold text-green-700">
                      {formatXOF(selectedDayTotals.ownerAmount)}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tableau détaillé */}
      <Card>
        <CardHeader>
          <CardTitle>
            {isFieldView 
              ? `Historique des réservations - ${selectedField?.name}`
              : 'Performance par terrain'
            }
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            {!isFieldView ? (
              // Vue globale - Table des terrains
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Terrain</th>
                    <th className="text-right p-2">Réservations</th>
                    <th className="text-right p-2">Revenus nets</th>
                    <th className="text-right p-2">Note moyenne</th>
                    <th className="text-right p-2">Nombre d'avis</th>
                    <th className="text-right p-2">Action</th>
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
                          <Star className="w-4 h-4 text-yellow-500" />
                          <span className="font-medium">{Number(stat.avg_rating).toFixed(1)}</span>
                        </div>
                      </td>
                      <td className="p-2 text-right text-gray-600">
                        {stat.total_reviews}
                      </td>
                      <td className="p-2 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            handleFieldSelect(stat.field_id);
                            handleViewModeChange('field');
                          }}
                        >
                          Détails
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              // Vue terrain - Table des réservations
              bookingDetails && bookingDetails.length > 0 ? (
                <div>
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Date</th>
                        <th className="text-left p-2">Créneau</th>
                        <th className="text-right p-2">Prix total</th>
                        <th className="text-right p-2">Revenus nets</th>
                        <th className="text-center p-2">Statut</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(showAllBookings ? bookingDetails : bookingDetails.slice(0, 5)).map((booking) => (
                        <tr key={booking.id} className="border-b hover:bg-gray-50">
                          <td className="p-2">
                            {new Date(booking.booking_date).toLocaleDateString('fr-FR')}
                          </td>
                          <td className="p-2">
                            {booking.start_time.substring(0, 5)} - {booking.end_time.substring(0, 5)}
                          </td>
                          <td className="p-2 text-right font-medium">
                            {formatXOF(booking.total_price)}
                          </td>
                          <td className="p-2 text-right font-bold text-green-700">
                            {formatXOF(booking.owner_amount)}
                          </td>
                          <td className="p-2 text-center">
                            <Badge 
                              variant={booking.status === 'completed' ? 'default' : 'secondary'}
                              className="capitalize"
                            >
                              {booking.status === 'confirmed' ? 'Confirmé' :
                               booking.status === 'completed' ? 'Terminé' :
                               booking.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  {bookingDetails.length > 5 && (
                    <div className="flex justify-center mt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowAllBookings(!showAllBookings)}
                        className="flex items-center gap-2"
                      >
                        {showAllBookings ? (
                          <>
                            <ChevronUp className="w-4 h-4" />
                            Voir moins
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-4 h-4" />
                            Voir plus ({bookingDetails.length - 5} autres)
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">Aucune réservation pour la période sélectionnée</p>
                </div>
              )
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OwnerStats;
