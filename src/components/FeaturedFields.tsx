
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import FieldCard from './FieldCard';

interface DatabaseField {
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

const FeaturedFields = () => {
  const navigate = useNavigate();

  const { data: fields, isLoading } = useQuery({
    queryKey: ['featured-fields'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fields')
        .select('*')
        .eq('is_active', true)
        .order('rating', { ascending: false })
        .limit(6);

      if (error) throw error;
      return data as DatabaseField[];
    }
  });

  const getFieldTypeLabel = (type: string) => {
    switch (type) {
      case 'natural_grass': return 'Gazon naturel';
      case 'synthetic': return 'Synthétique';
      case 'indoor': return 'Indoor';
      case 'street': return 'Bitume';
      default: return type;
    }
  };

  // Transform database fields to FieldCard format
  const transformedFields = fields?.map(field => ({
    id: field.id,
    name: field.name,
    location: field.location,
    price: field.price_per_hour,
    rating: field.rating || 0,
    reviews: field.total_reviews || 0,
    image: field.images?.[0] || 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    features: field.amenities || [],
    capacity: field.capacity,
    type: getFieldTypeLabel(field.field_type)
  })) || [];

  if (isLoading) {
    return (
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Terrains populaires à Abidjan
            </h2>
            <p className="text-xl text-gray-600">
              Découvrez les terrains les mieux notés par notre communauté
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white rounded-2xl shadow-md animate-pulse">
                <div className="h-48 bg-gray-200 rounded-t-2xl"></div>
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-8 bg-gray-200 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 px-4 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Terrains populaires à Abidjan
          </h2>
          <p className="text-xl text-gray-600">
            Découvrez les terrains les mieux notés par notre communauté
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {transformedFields.map((field) => (
            <FieldCard key={field.id} field={field} />
          ))}
        </div>

        <div className="text-center mt-12">
          <button 
            onClick={() => navigate('/search')}
            className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg font-medium transition-colors"
          >
            Voir tous les terrains
          </button>
        </div>
      </div>
    </section>
  );
};

export default FeaturedFields;
