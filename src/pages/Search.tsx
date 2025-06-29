import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import Navbar from '@/components/Navbar';
import FieldCard from '@/components/FieldCard';
import SearchBar from '@/components/SearchBar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { MapPin, Filter, Grid, List } from 'lucide-react';
import { parseTimeSlot } from '@/utils/timeSlotParser';
import { timeToMinutes, minutesToTime } from '@/utils/timeUtils';

interface Field {
  id: string;
  name: string;
  location: string;
  address: string;
  city: string;
  price_per_hour: number;
  rating: number;
  total_reviews: number;
  images: string[];
  amenities: string[];
  capacity: number;
  field_type: string;
}

const Search = () => {
  const [searchParams] = useSearchParams();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filters, setFilters] = useState({
    priceMin: '',
    priceMax: '',
    fieldType: 'all',
    capacity: '',
    sortBy: 'rating'
  });

  const location = searchParams.get('location') || '';
  const date = searchParams.get('date') || '';
  const timeSlot = searchParams.get('timeSlot') || '';
  const players = searchParams.get('players') || '';

  const { data: fields, isLoading } = useQuery({
    queryKey: ['fields', location, date, timeSlot, filters],
    queryFn: async () => {
      console.log('🔍 Recherche avec paramètres:', { location, date, timeSlot });
      
      // Parse time slot if provided
      const parsedTimeSlot = timeSlot ? parseTimeSlot(timeSlot) : null;
      console.log('🔍 Créneau parsé:', parsedTimeSlot);

      let query = supabase
        .from('fields')
        .select('*')
        .eq('is_active', true);

      // Location filter
      if (location) {
        query = query.or(`city.ilike.%${location}%,location.ilike.%${location}%,address.ilike.%${location}%`);
      }

      // Price filters
      if (filters.priceMin) {
        query = query.gte('price_per_hour', parseFloat(filters.priceMin));
      }

      if (filters.priceMax) {
        query = query.lte('price_per_hour', parseFloat(filters.priceMax));
      }

      // Field type filter
      if (filters.fieldType && filters.fieldType !== 'all') {
        query = query.eq('field_type', filters.fieldType);
      }

      // Capacity filters
      if (filters.capacity) {
        query = query.gte('capacity', parseInt(filters.capacity));
      }

      if (players) {
        query = query.gte('capacity', parseInt(players));
      }

      // Sorting
      if (filters.sortBy === 'price_asc') {
        query = query.order('price_per_hour', { ascending: true });
      } else if (filters.sortBy === 'price_desc') {
        query = query.order('price_per_hour', { ascending: false });
      } else {
        query = query.order('rating', { ascending: false });
      }

      const { data: allFields, error } = await query;
      if (error) throw error;

      console.log('🔍 Terrains trouvés avant filtrage horaire:', allFields?.length);

      // If date and time slot are provided, filter by availability
      if (date && parsedTimeSlot && parsedTimeSlot.isValid) {
        const availableFields = [];
        
        for (const field of allFields || []) {
          console.log(`🔍 Vérification terrain: ${field.name}`);
          
          // Générer tous les créneaux de 30 min requis
          const requiredSlots = [];
          const startMinutes = timeToMinutes(parsedTimeSlot.startTime);
          const endMinutes = timeToMinutes(parsedTimeSlot.endTime);
          
          for (let minutes = startMinutes; minutes < endMinutes; minutes += 30) {
            const slotStart = minutesToTime(minutes);
            const slotEnd = minutesToTime(minutes + 30);
            requiredSlots.push({ start: slotStart, end: slotEnd });
          }
          
          console.log(`🔍 Créneaux requis pour ${field.name}:`, requiredSlots);

          // Vérifier la disponibilité de chaque créneau requis
          let isFieldAvailable = true;
          
          for (const slot of requiredSlots) {
            // Vérifier si ce créneau spécifique existe et est disponible
            const { data: availableSlot } = await supabase
              .from('field_availability')
              .select('*')
              .eq('field_id', field.id)
              .eq('date', date)
              .eq('start_time', slot.start)
              .eq('end_time', slot.end)
              .eq('is_available', true)
              .single();

            if (!availableSlot) {
              console.log(`🔍 ❌ Créneau ${slot.start}-${slot.end} NON disponible pour ${field.name}`);
              isFieldAvailable = false;
              break;
            } else {
              console.log(`🔍 ✅ Créneau ${slot.start}-${slot.end} disponible pour ${field.name}`);
            }
          }

          // Si tous les créneaux sont disponibles, vérifier les conflits de réservation
          if (isFieldAvailable) {
            const { data: conflictingBookings } = await supabase
              .from('bookings')
              .select('start_time, end_time')
              .eq('field_id', field.id)
              .eq('booking_date', date)
              .in('status', ['pending', 'confirmed', 'owner_confirmed'])
              .or(
                `and(start_time.lt.${parsedTimeSlot.endTime},end_time.gt.${parsedTimeSlot.startTime})`
              );

            if (conflictingBookings && conflictingBookings.length > 0) {
              console.log(`🔍 ❌ Conflit de réservation détecté pour ${field.name}:`, conflictingBookings);
              isFieldAvailable = false;
            } else {
              console.log(`🔍 ✅ Aucun conflit de réservation pour ${field.name}`);
            }
          }

          if (isFieldAvailable) {
            console.log(`🔍 ✅ Terrain ${field.name} INCLUS dans les résultats`);
            availableFields.push(field);
          } else {
            console.log(`🔍 ❌ Terrain ${field.name} EXCLU des résultats`);
          }
        }

        console.log('🔍 Terrains disponibles après filtrage:', availableFields.length);
        return availableFields as Field[];
      }

      return allFields as Field[];
    }
  });

  const transformedFields = fields?.map(field => ({
    id: field.id,
    name: field.name,
    location: `${field.city}`,
    price: field.price_per_hour,
    rating: field.rating || 0,
    reviews: field.total_reviews || 0,
    image: field.images?.[0] || 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    features: field.amenities || [],
    capacity: field.capacity,
    type: field.field_type === 'natural_grass' ? 'Gazon naturel' :
          field.field_type === 'synthetic' ? 'Synthétique' :
          field.field_type === 'indoor' ? 'Indoor' : 'Bitume'
  })) || [];

  const getSearchSummary = () => {
    let summary = `${transformedFields.length} terrain${transformedFields.length > 1 ? 's' : ''} trouvé${transformedFields.length > 1 ? 's' : ''}`;
    
    if (location) summary += ` près de ${location}`;
    if (date) summary += ` pour le ${new Date(date).toLocaleDateString('fr-FR')}`;
    if (timeSlot) summary += ` à ${timeSlot}`;
    
    return summary;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <SearchBar />
        </div>

        <div className="flex gap-8">
          {/* Sidebar Filters */}
          <div className="w-1/4">
            <Card className="sticky top-8">
              <CardContent className="p-6">
                <div className="flex items-center space-x-2 mb-6">
                  <Filter className="w-5 h-5" />
                  <h3 className="text-lg font-semibold">Filtres</h3>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">
                      Prix par heure
                    </label>
                    <div className="flex space-x-2">
                      <Input
                        placeholder="Min"
                        value={filters.priceMin}
                        onChange={(e) => setFilters({...filters, priceMin: e.target.value})}
                      />
                      <Input
                        placeholder="Max"
                        value={filters.priceMax}
                        onChange={(e) => setFilters({...filters, priceMax: e.target.value})}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">
                      Type de terrain
                    </label>
                    <Select value={filters.fieldType} onValueChange={(value) => setFilters({...filters, fieldType: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Tous les types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tous les types</SelectItem>
                        <SelectItem value="natural_grass">Gazon naturel</SelectItem>
                        <SelectItem value="synthetic">Synthétique</SelectItem>
                        <SelectItem value="indoor">Indoor</SelectItem>
                        <SelectItem value="street">Bitume</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">
                      Capacité minimum
                    </label>
                    <Input
                      placeholder="Nombre de joueurs"
                      value={filters.capacity}
                      onChange={(e) => setFilters({...filters, capacity: e.target.value})}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">
                      Trier par
                    </label>
                    <Select value={filters.sortBy} onValueChange={(value) => setFilters({...filters, sortBy: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="rating">Mieux notés</SelectItem>
                        <SelectItem value="price_asc">Prix croissant</SelectItem>
                        <SelectItem value="price_desc">Prix décroissant</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button 
                    onClick={() => setFilters({
                      priceMin: '',
                      priceMax: '',
                      fieldType: 'all',
                      capacity: '',
                      sortBy: 'rating'
                    })}
                    variant="outline"
                    className="w-full"
                  >
                    Réinitialiser
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Results */}
          <div className="flex-1">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center space-x-2">
                <MapPin className="w-5 h-5 text-gray-500" />
                <span className="text-gray-600">
                  {getSearchSummary()}
                </span>
              </div>
              
              <div className="flex items-center space-x-2">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                >
                  <Grid className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {isLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Recherche des terrains...</p>
              </div>
            ) : (
              <div className={`grid gap-6 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
                {transformedFields.map((field) => (
                  <FieldCard key={field.id} field={field} />
                ))}
              </div>
            )}

            {!isLoading && transformedFields.length === 0 && (
              <div className="text-center py-12">
                <MapPin className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-600 mb-2">
                  Aucun terrain trouvé
                </h3>
                <p className="text-gray-500">
                  Essayez de modifier vos critères de recherche
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Search;
