
import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import SearchBar from '@/components/SearchBar';
import SearchFilters from '@/components/search/SearchFilters';
import SearchHeader from '@/components/search/SearchHeader';
import SearchResults from '@/components/search/SearchResults';
import { useSearchQuery } from '@/hooks/useSearchQuery';

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

  const { data: fields, isLoading } = useSearchQuery({
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
          field.field_type === 'indoor' ? 'Indoor' : 'Bitume'
  })) || [];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <SearchBar />
        </div>

        {/* Mobile: Stack vertically, Desktop: Side by side */}
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
      </div>
    </div>
  );
};

export default Search;
