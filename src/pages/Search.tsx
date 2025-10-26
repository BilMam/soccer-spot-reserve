import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import SearchBar from '@/components/SearchBar';
import SearchFilters from '@/components/search/SearchFilters';
import SearchHeader from '@/components/search/SearchHeader';
import SearchResults from '@/components/search/SearchResults';
import GoogleMap from '@/components/search/GoogleMap';
import ViewToggle from '@/components/search/ViewToggle';
import FieldCard from '@/components/FieldCard';
import { useSearchQuery } from '@/hooks/useSearchQuery';
import { useIsMobile } from '@/hooks/use-mobile';

const Search = () => {
  const [searchParams] = useSearchParams();
  const isMobile = useIsMobile();
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'map'>('grid');
  const [filters, setFilters] = useState({
    priceMin: '',
    priceMax: '',
    fieldType: 'all',
    capacity: '',
    sortBy: 'rating',
    sport: 'all',
  });

  // Handle mobile view mode - if on mobile and grid is selected, switch to list
  useEffect(() => {
    if (isMobile && viewMode === 'grid') {
      setViewMode('list');
    }
  }, [isMobile, viewMode]);

  const location = searchParams.get('location') || '';
  const date = searchParams.get('date') || '';
  const timeSlot = searchParams.get('timeSlot') || '';
  const players = searchParams.get('players') || '';

  console.log('🔍 Search Page - Paramètres URL:', { location, date, timeSlot, players });

  const { data: fields, isLoading } = useSearchQuery({
    location,
    date,
    timeSlot,
    players,
    filters
  });

  const transformedFields = fields?.map(field => {
    const transformedField = {
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
            field.field_type === 'indoor' ? 'Indoor' : 'Bitume',
      // IMPORTANT: Coordonnées GPS pour la carte
      latitude: field.latitude,
      longitude: field.longitude
    };
    
    console.log(`🔄 Terrain transformé "${field.name}":`, {
      originalLat: field.latitude,
      originalLng: field.longitude,
      transformedLat: transformedField.latitude,
      transformedLng: transformedField.longitude,
      hasGPS: !!(transformedField.latitude && transformedField.longitude)
    });
    
    return transformedField;
  }) || [];

  console.log('🎯 Search Page - Terrains transformés pour GoogleMap:', {
    total: transformedFields.length,
    withGPS: transformedFields.filter(f => f.latitude && f.longitude).length,
    firstFieldGPS: transformedFields[0] ? {
      name: transformedFields[0].name,
      lat: transformedFields[0].latitude,
      lng: transformedFields[0].longitude
    } : null
  });

  const handleFieldSelect = (fieldId: string) => {
    const fieldElement = document.getElementById(`field-${fieldId}`);
    if (fieldElement) {
      fieldElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <SearchBar />
        </div>

        {/* View Toggle - Always visible */}
        <div className="mb-6 flex justify-center">
          <ViewToggle viewMode={viewMode} onViewModeChange={setViewMode} />
        </div>

        {/* Map View */}
        {viewMode === 'map' && (
          <div className="space-y-8">
            <GoogleMap 
              fields={transformedFields}
              onFieldSelect={handleFieldSelect}
              searchLocation={location}
            />
            
            {/* Results below map */}
            <div>
              <h3 className="text-lg font-semibold mb-4">
                {transformedFields.length} terrain(s) trouvé(s)
                {location && ` pour "${location}"`}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {transformedFields.map((field) => (
                  <FieldCard key={field.id} field={field} />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* List/Grid Views */}
        {viewMode !== 'map' && (
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="w-full lg:w-1/4">
              <SearchFilters 
                filters={filters}
                onFiltersChange={setFilters}
              />
            </div>

            <div className="w-full lg:flex-1">
              <SearchHeader
                resultsCount={transformedFields.length}
                location={location}
                date={date}
                timeSlot={timeSlot}
              />

              <SearchResults
                fields={transformedFields}
                isLoading={isLoading}
                viewMode={viewMode}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Search;
