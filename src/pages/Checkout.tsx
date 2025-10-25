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
import { formatXOF } from '@/utils/publicPricing';

interface CheckoutState {
  selectedDate: Date;
  selectedStartTime: string;
  selectedEndTime: string;
  subtotal: number;  // Prix public (ce que le client voit avant frais opérateurs)
  serviceFee: number;  // Frais opérateurs
  totalPrice: number;  // Prix public + frais opérateurs
}

interface Field {
  id: string;
  name: string;
  location: string;
  address: string;
  city: string;
  price_per_hour: number;
  net_price_1h?: number;
  net_price_1h30?: number | null;
  net_price_2h?: number | null;
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

  const createBookingMutation = useMutation({
    mutationFn: async () => {
      if (!user) {
        throw new Error('Vous devez vous inscrire ou vous connecter pour pouvoir réserver un terrain.');
      }
      
      if (!checkoutData || !field) {
        throw new Error('Données manquantes pour la réservation');
      }

      // Calculer la durée et les montants
      const [startHour, startMin] = checkoutData.selectedStartTime.split(':').map(Number);
      const [endHour, endMin] = checkoutData.selectedEndTime.split(':').map(Number);
      const durationMinutes = (endHour * 60 + endMin) - (startHour * 60 + startMin);

      // Prix PUBLIC (déjà calculé dans checkoutData.subtotal)
      const publicPriceTotal = checkoutData.subtotal;
      
      // Calculer le montant net propriétaire
      const getNetPriceForOwner = (durationMin: number): number => {
        switch (durationMin) {
          case 60:
            return field.net_price_1h || field.price_per_hour;
          case 90:
            return field.net_price_1h30 || (field.net_price_1h || field.price_per_hour) * 1.5;
          case 120:
            return field.net_price_2h || (field.net_price_1h || field.price_per_hour) * 2;
          default:
            const hours = durationMin / 60;
            return (field.net_price_1h || field.price_per_hour) * hours;
        }
      };

      const netPriceOwner = getNetPriceForOwner(durationMinutes);
      const platformCommission = publicPriceTotal - netPriceOwner;

      // Le total envoyé à PayDunya inclut les frais opérateurs
      const finalTotalWithOperatorFees = checkoutData.totalPrice;

      // Créer la réservation
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .insert({
          field_id: id,
          user_id: user.id,
          booking_date: checkoutData.selectedDate.toISOString().split('T')[0],
          start_time: checkoutData.selectedStartTime,
          end_time: checkoutData.selectedEndTime,
          
          // Nouveau modèle de prix
          total_price: publicPriceTotal,  // Prix public (ce que voit le client AVANT frais opérateurs)
          field_price: netPriceOwner,  // Prix net pour le propriétaire
          platform_fee_user: 0,  // Pas de frais user séparés
          platform_fee_owner: platformCommission,  // Commission plateforme (TOUTE la différence)
          owner_amount: netPriceOwner,  // Montant net EXACT garanti au propriétaire
          
          status: 'pending',
          payment_status: 'pending',
          currency: 'XOF',
          payment_provider: 'paydunya'
        })
        .select()
        .single();

      if (bookingError) {
        throw new Error(`Impossible de créer la réservation: ${bookingError.message}`);
      }

      // Créer le paiement PayDunya avec le montant TOTAL (incluant frais opérateurs)
      const paymentRequestData = {
        booking_id: booking.id,
        amount: finalTotalWithOperatorFees,  // Montant final avec frais opérateurs
        field_name: field.name,
        date: checkoutData.selectedDate.toLocaleDateString('fr-FR'),
        time: `${checkoutData.selectedStartTime} - ${checkoutData.selectedEndTime}`
      };

      console.log('🔍 Debug paymentRequestData PayDunya:', paymentRequestData);

      const { data: paymentData, error: paymentError } = await supabase.functions.invoke('create-paydunya-invoice', {
        body: paymentRequestData
      });

      if (paymentError) {
        throw new Error(`Erreur de paiement PayDunya: ${paymentError.message}`);
      }

      if (!paymentData?.url) {
        throw new Error('URL de paiement PayDunya non générée');
      }

      // Rediriger vers PayDunya
      setTimeout(() => {
        window.location.href = paymentData.url;
      }, 1500);

      return { booking, paymentUrl: paymentData.url };
    },
    onSuccess: () => {
      toast({
        title: "Redirection vers le paiement",
        description: `Vous allez être redirigé vers PayDunya pour payer ${formatXOF(checkoutData?.totalPrice || 0)}`,
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

  const calculateDuration = () => {
    if (!checkoutData) return { hours: 0, minutes: 0, hoursFloat: 0 };
    const [startHour, startMin] = checkoutData.selectedStartTime.split(':').map(Number);
    const [endHour, endMin] = checkoutData.selectedEndTime.split(':').map(Number);
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    const totalMinutes = endMinutes - startMinutes;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const hoursFloat = totalMinutes / 60;
    return { hours, minutes, hoursFloat };
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
                      <p>Orange Money, MTN Mobile Money, Moov Money, Wave, Visa/Mastercard - Choisissez directement sur la page de paiement PayDunya.</p>
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
                         {(() => {
                           const duration = calculateDuration();
                           let display = '';
                           if (duration.hours > 0) display += `${duration.hours}h`;
                           if (duration.minutes > 0) display += `${duration.minutes}min`;
                           return display || '0h';
                         })()}
                       </p>
                    </div>
                  </div>
                </div>

                 {/* Calcul prix */}
                 <div className="space-y-3 py-4">
                   <div className="flex justify-between text-sm">
                     <span>Location terrain</span>
                     <span>{formatXOF(checkoutData.subtotal)}</span>
                   </div>
                   <div className="flex justify-between text-sm text-muted-foreground">
                     <span>Frais opérateurs – paiement sécurisé</span>
                     <span>{formatXOF(checkoutData.serviceFee)}</span>
                   </div>
                   <div className="flex justify-between text-lg font-bold pt-2 border-t">
                     <span>Total à payer</span>
                     <span className="text-primary">{formatXOF(checkoutData.totalPrice)}</span>
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
                    `Payer ${formatXOF(checkoutData.totalPrice)}`
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
