import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import FieldCard from './FieldCard';
import { getDefaultSportImage } from '@/utils/defaultImages';
import { getFieldTypeLabel } from '@/utils/fieldUtils';
import { calculatePublicPrice } from '@/utils/publicPricing';
import { useActivePromosForFields } from '@/hooks/useActivePromosForField';

interface DatabaseField {
  id: string;
  name: string;
  location: string;
  address: string;
  city: string;
  price_per_hour: number;
  net_price_1h?: number;
  net_price_1h30?: number | null;
  net_price_2h?: number | null;
  public_price_1h?: number;
  public_price_1h30?: number | null;
  public_price_2h?: number | null;
  rating: number;
  total_reviews: number;
  images: string[];
  amenities: string[];
  capacity: number;
  field_type: string;
  sport_type: string;
}

const FeaturedFields = () => {
  const navigate = useNavigate();

  const { data: fields, isLoading } = useQuery({
    queryKey: ['featured-fields'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fields')
        .select(`
          *,
          net_price_1h,
          net_price_1h30,
          net_price_2h,
          public_price_1h,
          public_price_1h30,
          public_price_2h
        `)
        .eq('is_active', true)
        .order('rating', { ascending: false })
        .limit(6);

      if (error) throw error;
      return data as DatabaseField[];
    }
  });

  // Récupérer les promos actives pour tous les terrains affichés
  const fieldIds = fields?.map(f => f.id) || [];
  const { data: promosMap } = useActivePromosForFields(fieldIds);

  // Transform database fields to FieldCard format
  const transformedFields = fields?.map((field: DatabaseField) => {
    // Utiliser le prix PUBLIC pour l'affichage
    const publicPrice = field.public_price_1h 
      ?? (field.net_price_1h ? calculatePublicPrice(field.net_price_1h) : null)
      ?? (field.price_per_hour ? calculatePublicPrice(field.price_per_hour) : null);
    
    // Récupérer les promos pour ce terrain (tableau)
    const fieldPromos = promosMap?.[field.id] || [];
    
    return {
      id: field.id,
      name: field.name,
      location: field.location,
      price: publicPrice,
      rating: field.rating || 0,
      reviews: field.total_reviews || 0,
      image: field.images?.[0] || getDefaultSportImage(field.sport_type),
      features: field.amenities || [],
      capacity: field.capacity,
      type: getFieldTypeLabel(field.field_type),
      sport_type: field.sport_type,
      promos: fieldPromos.map(p => ({
        discountType: p.discountType,
        discountValue: p.discountValue,
        endDate: p.endDate,
        isAutomatic: p.isAutomatic
      }))
    };
  }) || [];

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
            <FieldCard key={field.id} field={field} promos={field.promos} />
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
