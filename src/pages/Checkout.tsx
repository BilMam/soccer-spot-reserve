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
  
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('');

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

      const { data: paymentData, error: paymentError } = await supabase.functions.invoke('create-cinetpay-payment', {
        body: paymentRequestData,
        headers: {
          'Content-Type': 'application/json',
        }
      });

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
    if (!selectedPaymentMethod) {
      toast({
        title: "Moyen de paiement requis",
        description: "Veuillez sélectionner un moyen de paiement",
        variant: "destructive"
      });
      return;
    }

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

  const paymentMethods = [
    { id: 'orange_money', name: 'Orange Money', icon: Smartphone, color: 'bg-orange-500' },
    { id: 'mtn_money', name: 'MTN Mobile Money', icon: Smartphone, color: 'bg-yellow-500' },
    { id: 'moov_money', name: 'Moov Money', icon: Smartphone, color: 'bg-blue-500' },
    { id: 'wave', name: 'Wave', icon: Smartphone, color: 'bg-blue-600' },
    { id: 'visa_mastercard', name: 'Visa / Mastercard', icon: CreditCard, color: 'bg-gray-700' }
  ];

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
                <CardTitle className="text-2xl">Choisir votre moyen de paiement</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Moyens de paiement */}
                <div>
                  <div className="grid grid-cols-1 gap-3">
                    {paymentMethods.map((method) => (
                      <button
                        key={method.id}
                        type="button"
                        onClick={() => setSelectedPaymentMethod(method.id)}
                        className={`p-4 border-2 rounded-lg flex items-center space-x-3 transition-all hover:bg-gray-50 ${
                          selectedPaymentMethod === method.id
                            ? 'border-green-500 bg-green-50'
                            : 'border-gray-200'
                        }`}
                      >
                        <div className={`p-2 rounded-lg text-white ${method.color}`}>
                          <method.icon className="w-5 h-5" />
                        </div>
                        <span className="font-medium">{method.name}</span>
                        {selectedPaymentMethod === method.id && (
                          <div className="ml-auto w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                            <div className="w-2 h-2 bg-white rounded-full"></div>
                          </div>
                        )}
                      </button>
                    ))}
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
