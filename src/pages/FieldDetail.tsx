import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import Navbar from '@/components/Navbar';
import ReviewsList from '@/components/ReviewsList';
import FavoriteButton from '@/components/FavoriteButton';
import FieldCalendar from '@/components/FieldCalendar';
import FieldMediaCarousel from '@/components/FieldMediaCarousel';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Star, MapPin, Users, Clock, Wifi, Car, ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getDefaultSportImage } from '@/utils/defaultImages';
import { getFieldTypeLabel } from '@/utils/fieldUtils';
import { useActivePromosForField } from '@/hooks/useActivePromosForField';
import PromoInfoChip from '@/components/promotions/PromoInfoChip';
import { useCreateBookingWithPayment } from '@/hooks/useCreateBookingWithPayment';
import { calculateNetFromPublic } from '@/utils/publicPricing';

interface Field {
  id: string;
  name: string;
  description: string;
  location: string;
  address: string;
  city: string;
  price_per_hour: number;
  price_1h30?: number | null;
  price_2h?: number | null;
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
  availability_start: string;
  availability_end: string;
  owner_id: string;
}

const FieldDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: field, isLoading } = useQuery({
    queryKey: ['field', id],
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
        .eq('id', id)
        .eq('is_active', true)
        .single();

      if (error) throw error;
      return data as Field;
    }
  });

  // Récupérer les promos actives pour ce terrain
  const { data: activePromos } = useActivePromosForField(id);

  // Hook pour créer la réservation et le paiement
  const createBookingMutation = useCreateBookingWithPayment();

  const getAmenityIcon = (amenity: string) => {
    switch (amenity.toLowerCase()) {
      case 'wifi':
        return <Wifi className="w-4 h-4" />;
      case 'parking':
        return <Car className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const handleTimeSlotSelect = (
    date: Date,
    startTime: string,
    endTime: string,
    subtotal: number,
    serviceFee: number,
    total: number,
    promoId?: string,
    discountAmount?: number
  ) => {
    console.log('🎯 Sélection créneau dans FieldDetail:', {
      date: date.toISOString(),
      startTime,
      endTime,
      subtotal,
      serviceFee,
      total,
      promoId,
      discountAmount
    });

    if (!user) {
      toast({
        title: "Connexion requise",
        description: "Veuillez vous connecter pour réserver un terrain.",
        variant: "destructive"
      });
      navigate('/auth');
      return;
    }

    if (!field) {
      toast({
        title: "Erreur",
        description: "Informations du terrain non disponibles.",
        variant: "destructive"
      });
      return;
    }

    // Calculer la durée et les montants
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    const durationMinutes = (endHour * 60 + endMin) - (startHour * 60 + startMin);

    // Prix PUBLIC
    const publicPriceAfterPromo = subtotal; // Prix après promo (si applicable)
    const publicPriceBeforePromo = discountAmount ? subtotal + discountAmount : subtotal; // Prix avant promo

    // ✅ VRAIE LOGIQUE OWNER-FUNDED :
    // Le NET propriétaire est extrait depuis le prix public APRÈS promo
    // Car la promo réduit le NET, puis le prix public est recalculé depuis le nouveau NET
    const netPriceOwner = calculateNetFromPublic(publicPriceAfterPromo);

    // La commission PISport est calculée sur le prix APRÈS promo
    // Commission = Prix public APRÈS - Net APRÈS
    const platformCommission = publicPriceAfterPromo - netPriceOwner;

    // Créer la réservation et initialiser le paiement
    createBookingMutation.mutate({
      fieldId: field.id,
      fieldName: field.name,
      userId: user.id,
      bookingDate: date,
      startTime,
      endTime,
      publicPrice: publicPriceAfterPromo, // Prix final payé par le client (après promo si applicable)
      publicPriceBeforePromo: publicPriceBeforePromo, // Prix de base (toujours passé pour calcul cohérent)
      promoId,
      discountAmount,
      netPriceOwner,
      platformCommission
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
        </div>
      </div>
    );
  }

  if (!field) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container mx-auto px-4 py-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Terrain non trouvé</h1>
          <Button onClick={() => navigate('/search')}>
            Retour à la recherche
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <Button 
          variant="ghost" 
          onClick={() => navigate(-1)}
          className="mb-6 flex items-center space-x-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Retour</span>
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Images/Videos Carousel */}
            <FieldMediaCarousel
              images={field.images}
              fallback={getDefaultSportImage(field.sport_type)}
              fieldName={field.name}
              fieldType={field.field_type}
              rating={field.rating}
              totalReviews={field.total_reviews}
            />

            {/* Field Info */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <h1 className="text-3xl font-bold text-gray-900">{field.name}</h1>
                  <FavoriteButton fieldId={field.id} size="default" variant="outline" />
                </div>
                
                <div className="flex items-center text-gray-600 mb-4">
                  <MapPin className="w-5 h-5 mr-2" />
                  <span>{field.address}, {field.city}</span>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="flex items-center space-x-2">
                    <Users className="w-5 h-5 text-gray-500" />
                    <span className="text-gray-700">{field.capacity} joueurs max</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Clock className="w-5 h-5 text-gray-500" />
                    <span className="text-gray-700">
                      {field.availability_start} - {field.availability_end}
                    </span>
                  </div>
                </div>

                {/* Chip promo discret */}
                {activePromos && activePromos.length > 0 && (
                  <div className="mb-6">
                    <PromoInfoChip promos={activePromos} />
                  </div>
                )}

                {field.description && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-2">Description</h3>
                    <p className="text-gray-700 leading-relaxed">{field.description}</p>
                  </div>
                )}

                {field.amenities && field.amenities.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Équipements</h3>
                    <div className="flex flex-wrap gap-2">
                      {field.amenities.map((amenity, index) => (
                        <div key={index} className="flex items-center space-x-2 bg-gray-100 rounded-full px-3 py-2">
                          {getAmenityIcon(amenity)}
                          <span className="text-sm text-gray-700">{amenity}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Reviews */}
            <ReviewsList fieldId={field.id} />
          </div>

          {/* Sidebar - Calendar seulement */}
          <div className="lg:col-span-1">
            <div className="sticky top-8">
            <FieldCalendar
              fieldId={field.id}
              pricing={{
                net_price_1h: field.net_price_1h,
                net_price_1h30: field.net_price_1h30,
                net_price_2h: field.net_price_2h,
                public_price_1h: field.public_price_1h,
                public_price_1h30: field.public_price_1h30,
                public_price_2h: field.public_price_2h,
                price_per_hour: field.price_per_hour,
                price_1h30: field.price_1h30,
                price_2h: field.price_2h
              }}
              onTimeSlotSelect={handleTimeSlotSelect}
            />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FieldDetail;