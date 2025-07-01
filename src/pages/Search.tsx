
import React, { useState } from 'react';
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
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { geocodeExistingFields } from '@/utils/geocodingUtils';
import { toast } from 'sonner';

const Search = () => {
  const [searchParams] = useSearchParams();
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'map'>('grid');
  const [isGeocodingExisting, setIsGeocodingExisting] = useState(false);
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

  const { data: fields, isLoading, refetch } = useSearchQuery({
    location,
    date,
    timeSlot,
    players,
    filters
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
          field.field_type === 'indoor' ? 'Indoor' : 'Bitume',
    latitude: field.latitude,
    longitude: field.longitude
  })) || [];

  const handleFieldSelect = (fieldId: string) => {
    // Scroll to the field card or navigate to field detail
    const fieldElement = document.getElementById(`field-${fieldId}`);
    if (fieldElement) {
      fieldElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleGeocodeExistingFields = async () => {
    setIsGeocodingExisting(true);
    try {
      const result = await geocodeExistingFields();
      
      if (result.success > 0) {
        toast.success(`✅ ${result.success} terrain(s) géocodé(s) avec succès !`);
        // Rafraîchir les résultats
        refetch();
      }
      
      if (result.failed > 0) {
        toast.warning(`⚠️ ${result.failed} terrain(s) n'ont pas pu être géocodés`);
      }
      
      if (result.total === 0) {
        toast.info('ℹ️ Tous les terrains ont déjà des coordonnées GPS');
      }
      
    } catch (error) {
      console.error('Erreur géocodage:', error);
      toast.error('❌ Erreur lors du géocodage des terrains');
    } finally {
      setIsGeocodingExisting(false);
    }
  };

  const fieldsWithoutCoordinates = transformedFields.filter(field => !field.latitude || !field.longitude);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <SearchBar />
        </div>

        {/* Bouton de géocodage des terrains existants (uniquement en mode développement) */}
        {fieldsWithoutCoordinates.length > 0 && (
          <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-amber-800">
                  {fieldsWithoutCoordinates.length} terrain(s) sans coordonnées GPS
                </h3>
                <p className="text-xs text-amber-600">
                  Ces terrains n'apparaîtront pas sur la carte
                </p>
              </div>
              <Button
                variant="outline"
                onClick={handleGeocodeExistingFields}
                disabled={isGeocodingExisting}
                className="text-amber-700 border-amber-300 hover:bg-amber-100"
              >
                {isGeocodingExisting ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                Géocoder les terrains
              </Button>
            </div>
          </div>
        )}

        {/* Mobile View Toggle */}
        <div className="md:hidden mb-4">
          <ViewToggle viewMode={viewMode} onViewModeChange={setViewMode} />
        </div>

        {/* Map View */}
        {viewMode === 'map' && (
          <div className="mb-8">
            <GoogleMap 
              fields={transformedFields}
              onFieldSelect={handleFieldSelect}
              searchLocation={location}
            />
          </div>
        )}

        {/* List/Grid Views */}
        {viewMode !== 'map' && (
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Filters - Full width on mobile, sidebar on desktop */}
            <div className="w-full lg:w-1/4">
              <SearchFilters 
                filters={filters}
                onFiltersChange={setFilters}
              />
            </div>

            {/* Results - Full width on mobile, main content on desktop */}
            <div className="w-full lg:flex-1">
              <SearchHeader
                resultsCount={transformedFields.length}
                location={location}
                date={date}
                timeSlot={timeSlot}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
              />

              <SearchResults
                fields={transformedFields}
                isLoading={isLoading}
                viewMode={viewMode}
              />
            </div>
          </div>
        )}

        {/* Results below map in map view */}
        {viewMode === 'map' && (
          <div className="mt-8">
            <h3 className="text-lg font-semibold mb-4">Tous les terrains</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {transformedFields.map((field) => (
                <FieldCard key={field.id} field={field} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Search;
