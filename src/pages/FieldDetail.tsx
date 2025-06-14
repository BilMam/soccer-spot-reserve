
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import Navbar from '@/components/Navbar';
import BookingForm from '@/components/BookingForm';
import ReviewsList from '@/components/ReviewsList';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Star, MapPin, Users, Clock, Wifi, Car, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Field {
  id: string;
  name: string;
  description: string;
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
  availability_start: string;
  availability_end: string;
  owner_id: string;
}

const FieldDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [showBookingForm, setShowBookingForm] = useState(false);

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

  const handleBookingClick = () => {
    if (!user) {
      toast({
        title: "Connexion requise",
        description: "Vous devez être connecté pour réserver un terrain",
        variant: "destructive"
      });
      navigate('/auth');
      return;
    }
    setShowBookingForm(true);
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
                src={field.images?.[0] || 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'}
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
                <h1 className="text-3xl font-bold text-gray-900 mb-4">{field.name}</h1>
                
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

          {/* Sidebar - Booking */}
          <div className="lg:col-span-1">
            <div className="sticky top-8">
              {showBookingForm ? (
                <BookingForm 
                  field={field} 
                  onCancel={() => setShowBookingForm(false)}
                  onSuccess={() => {
                    setShowBookingForm(false);
                    toast({
                      title: "Réservation créée",
                      description: "Votre demande de réservation a été envoyée"
                    });
                  }}
                />
              ) : (
                <Card>
                  <CardContent className="p-6">
                    <div className="text-center mb-6">
                      <div className="text-3xl font-bold text-gray-900">
                        {field.price_per_hour}€
                      </div>
                      <div className="text-gray-500">par heure</div>
                    </div>

                    <Button 
                      onClick={handleBookingClick}
                      className="w-full bg-green-600 hover:bg-green-700 mb-4"
                      size="lg"
                    >
                      Réserver maintenant
                    </Button>

                    <div className="text-xs text-gray-500 text-center">
                      Annulation gratuite jusqu'à 2h avant
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FieldDetail;
