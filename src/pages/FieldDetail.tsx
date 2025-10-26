import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import Navbar from '@/components/Navbar';
import ReviewsList from '@/components/ReviewsList';
import FavoriteButton from '@/components/FavoriteButton';
import FieldCalendar from '@/components/FieldCalendar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Star, MapPin, Users, Clock, Wifi, Car, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { getDefaultSportImage } from '@/utils/defaultImages';

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
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedStartTime, setSelectedStartTime] = useState<string>('');
  const [selectedEndTime, setSelectedEndTime] = useState<string>('');
  const [totalPrice, setTotalPrice] = useState<number>(0);

  const { data: field, isLoading } = useQuery({
    queryKey: ['field', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fields')
        .select('*')
        .eq('id', id)
        .eq('is_active', true)
        .single();

      if (error) throw error;
      return data as Field;
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

  const handleTimeSlotSelect = async (date: Date, startTime: string, endTime: string, subtotal: number, serviceFee: number, total: number) => {
    console.log('🎯 Sélection créneau dans FieldDetail:', {
      date: date.toISOString(),
      startTime,
      endTime,
      subtotal,
      serviceFee,
      total
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
    
    try {
      // Créer la réservation en statut pending
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .insert({
          field_id: id,
          user_id: user.id,
          booking_date: format(date, 'yyyy-MM-dd'),
          start_time: startTime,
          end_time: endTime,
          total_price: subtotal,
          field_price: subtotal,
          platform_fee_user: serviceFee,
          status: 'pending',
          payment_status: 'pending'
        })
        .select()
        .single();

      if (bookingError || !booking) {
        throw new Error(bookingError?.message || 'Erreur lors de la création de la réservation');
      }

      // Appeler l'edge function PayDunya
      const { data: paymentData, error: paymentError } = await supabase.functions.invoke('create-paydunya-invoice', {
        body: {
          booking_id: booking.id,
          amount: total,
          field_name: field?.name || 'Terrain',
          date: format(date, 'dd/MM/yyyy'),
          time: `${startTime} - ${endTime}`
        }
      });

      if (paymentError || !paymentData?.url) {
        throw new Error(paymentError?.message || 'Erreur lors de la génération du paiement');
      }

      // Rediriger directement vers PayDunya
      window.location.href = paymentData.url;
      
    } catch (error: any) {
      console.error('Erreur lors de la réservation:', error);
      toast({
        title: "Erreur",
        description: error.message || "Une erreur est survenue lors de la réservation.",
        variant: "destructive"
      });
    }
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
            {/* Images */}
            <div className="relative h-96 rounded-2xl overflow-hidden">
              <img
                src={field.images?.[0] || getDefaultSportImage(field.sport_type)}
                alt={field.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-4 left-4">
                <Badge className="bg-green-600 hover:bg-green-700">
                  {getFieldTypeLabel(field.field_type)}
                </Badge>
              </div>
              <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-full px-3 py-2 flex items-center space-x-1">
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                <span className="font-medium">{field.rating}</span>
                <span className="text-gray-500">({field.total_reviews})</span>
              </div>
            </div>

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

                <div className="grid grid-cols-2 gap-4 mb-6">
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
                fieldPrice={field.price_per_hour}
                price1h30={field.price_1h30}
                price2h={field.price_2h}
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
