import React, { useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Star, 
  CreditCard, 
  Smartphone,
  ArrowLeft,
  Loader2,
  AlertCircle
} from 'lucide-react';

interface CheckoutState {
  selectedDate: Date;
  selectedStartTime: string;
  selectedEndTime: string;
  totalPrice: number;
}

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
  field_type: string;
}

const Checkout = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();

  const checkoutData = location.state as CheckoutState;
  
  // Plus besoin de sélecteur - CinetPay gère tous les moyens de paiement

  // Rediriger si pas de données de checkout
  React.useEffect(() => {
    if (!checkoutData) {
      navigate(`/field/${id}`);
    }
  }, [checkoutData, navigate, id]);

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

  const createBookingMutation = useMutation({
    mutationFn: async () => {
      if (!user || !checkoutData || !field) {
        throw new Error('Données manquantes pour la réservation');
      }

      const platformFee = Math.round(checkoutData.totalPrice * 0.05);
      const ownerAmount = checkoutData.totalPrice - platformFee;

      // Créer la réservation
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .insert({
          field_id: id,
          user_id: user.id,
          booking_date: checkoutData.selectedDate.toISOString().split('T')[0],
          start_time: checkoutData.selectedStartTime,
          end_time: checkoutData.selectedEndTime,
          total_price: checkoutData.totalPrice,
          platform_fee: platformFee,
          owner_amount: ownerAmount,
          status: 'pending',
          payment_status: 'pending',
          currency: 'XOF'
        })
        .select()
        .single();

      if (bookingError) {
        throw new Error(`Impossible de créer la réservation: ${bookingError.message}`);
      }

      // Créer le paiement CinetPay
      const paymentRequestData = {
        booking_id: booking.id,
        amount: checkoutData.totalPrice,
        field_name: field.name,
        date: checkoutData.selectedDate.toLocaleDateString('fr-FR'),
        time: `${checkoutData.selectedStartTime} - ${checkoutData.selectedEndTime}`
      };

      console.log('🔍 Debug paymentRequestData:', paymentRequestData);
      console.log('🔍 booking.id:', booking.id);
      console.log('🔍 checkoutData.totalPrice:', checkoutData.totalPrice);
      console.log('🔍 field.name:', field.name);
      console.log('🔍 selectedDate:', checkoutData.selectedDate);
      console.log('🔍 selectedStartTime:', checkoutData.selectedStartTime);
      console.log('🔍 selectedEndTime:', checkoutData.selectedEndTime);

      const response = await fetch('https://zldawmyoscicxoiqvfpu.supabase.co/functions/v1/create-cinetpay-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsZGF3bXlvc2NpY3hvaXF2ZnB1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk5MjY5NDAsImV4cCI6MjA2NTUwMjk0MH0.kKLUE9qwd4eCiegvGYvM3TKTPp8PuyycGp5L3wsUJu4'
        },
        body: JSON.stringify(paymentRequestData)
      });

      const paymentData = await response.json();
      const paymentError = !response.ok ? paymentData : null;

      if (paymentError) {
        throw new Error(`Erreur de paiement: ${paymentError.message}`);
      }

      if (!paymentData?.url) {
        throw new Error('URL de paiement non générée');
      }

      // Rediriger vers CinetPay
      setTimeout(() => {
        window.location.href = paymentData.url;
      }, 1500);

      return { booking, paymentUrl: paymentData.url };
    },
    onSuccess: () => {
      toast({
        title: "Redirection vers le paiement",
        description: `Vous allez être redirigé vers CinetPay pour payer ${checkoutData?.totalPrice.toLocaleString()} XOF`,
        duration: 2000
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur de réservation",
        description: error.message,
        variant: "destructive",
        duration: 5000
      });
    }
  });

  const handlePayment = () => {
    createBookingMutation.mutate();
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const calculateDurationHours = () => {
    if (!checkoutData) return 0;
    const startHour = parseInt(checkoutData.selectedStartTime.split(':')[0]);
    const endHour = parseInt(checkoutData.selectedEndTime.split(':')[0]);
    return endHour - startHour;
  };

  const getFieldTypeLabel = (type: string) => {
    switch (type) {
      case 'natural_grass': return 'Gazon naturel';
      case 'synthetic': return 'Synthétique';
      case 'indoor': return 'Indoor';
      case 'street': return 'Bitume';
      default: return type;
    }
  };

  if (isLoading || !field || !checkoutData) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
        </div>
      </div>
    );
  }

  // Supprimé : CinetPay affiche directement tous les moyens de paiement

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <Button 
          variant="ghost" 
          onClick={() => navigate(`/field/${id}`)}
          className="mb-6 flex items-center space-x-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Retour au terrain</span>
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Colonne gauche - Paiement */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">Paiement sécurisé</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Info moyens de paiement */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <CreditCard className="w-5 h-5 text-green-600 mt-0.5" />
                    <div className="text-sm text-green-800">
                      <p className="font-medium mb-1">Tous les moyens de paiement disponibles</p>
                      <p>Orange Money, MTN Mobile Money, Moov Money, Wave, Visa/Mastercard - Choisissez directement sur la page de paiement CinetPay.</p>
                    </div>
                  </div>
                </div>

                {/* Info sécurité */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div className="text-sm text-blue-800">
                      <p className="font-medium mb-1">Paiement 100% sécurisé</p>
                      <p>Vos fonds sont protégés jusqu'à confirmation de votre réservation par le propriétaire.</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Colonne droite - Résumé */}
          <div className="space-y-6">
            <Card className="sticky top-8">
              <CardContent className="p-6">
                {/* Image et infos terrain */}
                <div className="flex space-x-4 mb-6">
                  <img
                    src={field.images?.[0] || 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&q=80'}
                    alt={field.name}
                    className="w-20 h-20 rounded-lg object-cover"
                  />
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{field.name}</h3>
                    <div className="flex items-center space-x-2 text-gray-600 mb-2">
                      <MapPin className="w-4 h-4" />
                      <span className="text-sm">{field.address}, {field.city}</span>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-1">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        <span className="text-sm font-medium">{field.rating}</span>
                        <span className="text-sm text-gray-500">({field.total_reviews})</span>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {getFieldTypeLabel(field.field_type)}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Détails réservation */}
                <div className="space-y-4 py-4 border-t border-b border-gray-200">
                  <div className="flex items-center space-x-3">
                    <Calendar className="w-5 h-5 text-gray-500" />
                    <div>
                      <p className="font-medium">{formatDate(checkoutData.selectedDate)}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <Clock className="w-5 h-5 text-gray-500" />
                    <div>
                      <p className="font-medium">
                        {checkoutData.selectedStartTime} - {checkoutData.selectedEndTime}
                      </p>
                      <p className="text-sm text-gray-500">
                        {calculateDurationHours()} heure{calculateDurationHours() > 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Calcul prix */}
                <div className="space-y-3 py-4">
                  <div className="flex justify-between text-sm">
                    <span>{field.price_per_hour.toLocaleString()} XOF × {calculateDurationHours()}h</span>
                    <span>{checkoutData.totalPrice.toLocaleString()} XOF</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Commission plateforme (5%)</span>
                    <span>{Math.round(checkoutData.totalPrice * 0.05).toLocaleString()} XOF</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold pt-2 border-t">
                    <span>Total</span>
                    <span className="text-green-600">{checkoutData.totalPrice.toLocaleString()} XOF</span>
                  </div>
                </div>

                {/* Bouton paiement */}
                <Button
                  onClick={handlePayment}
                  disabled={createBookingMutation.isPending}
                  className="w-full bg-green-600 hover:bg-green-700 h-12 text-base font-medium"
                >
                  {createBookingMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Traitement en cours...
                    </>
                  ) : (
                    `Payer ${checkoutData.totalPrice.toLocaleString()} XOF`
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
