
import React, { useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Star, 
  User,
  ArrowLeft,
  Loader2,
  AlertCircle,
  Phone,
  Mail
} from 'lucide-react';

interface CheckoutState {
  selectedDate: Date;
  selectedStartTime: string;
  selectedEndTime: string;
  totalPrice: number;
  playerCount: number;
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
  owner_id: string;
}

const Checkout = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();

  const checkoutData = location.state as CheckoutState;
  const [specialRequests, setSpecialRequests] = useState('');
  
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
          profiles!fields_owner_id_fkey (full_name, phone, email)
        `)
        .eq('id', id)
        .eq('is_active', true)
        .single();

      if (error) throw error;
      return data as Field & { profiles: { full_name: string; phone: string; email: string } };
    }
  });

  const createBookingMutation = useMutation({
    mutationFn: async () => {
      if (!user || !checkoutData || !field) {
        throw new Error('Données manquantes pour la réservation');
      }

      // Créer la réservation avec le nouveau système
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .insert({
          field_id: id,
          user_id: user.id,
          booking_date: checkoutData.selectedDate.toISOString().split('T')[0],
          start_time: checkoutData.selectedStartTime,
          end_time: checkoutData.selectedEndTime,
          total_price: checkoutData.totalPrice,
          player_count: checkoutData.playerCount,
          special_requests: specialRequests || null,
          status: 'pending', // En attente de validation par le propriétaire
          payment_status: 'pending', // Paiement direct au propriétaire
          currency: 'XOF'
        })
        .select()
        .single();

      if (bookingError) {
        throw new Error(`Impossible de créer la réservation: ${bookingError.message}`);
      }

      return booking;
    },
    onSuccess: (booking) => {
      toast({
        title: "Réservation créée !",
        description: "Votre demande de réservation a été envoyée au propriétaire.",
      });
      
      navigate(`/booking-success?booking_id=${booking.id}`);
    },
    onError: (error: any) => {
      console.error('Erreur lors de la création de la réservation:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de créer la réservation",
        variant: "destructive"
      });
    }
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-md mx-auto">
            <Card>
              <CardContent className="py-8">
                <div className="animate-pulse space-y-4">
                  <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-32 bg-gray-200 rounded"></div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (!checkoutData || !field) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-md mx-auto">
            <Card>
              <CardContent className="py-8 text-center">
                <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
                <h2 className="text-xl font-semibold mb-2">Données manquantes</h2>
                <p className="text-gray-600 mb-4">
                  Impossible de procéder à la réservation.
                </p>
                <Button onClick={() => navigate('/')}>
                  Retour à l'accueil
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="flex items-center mb-6">
            <Button 
              variant="ghost" 
              onClick={() => navigate(`/field/${id}`)}
              className="mr-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour
            </Button>
            <h1 className="text-2xl font-bold">Finaliser la réservation</h1>
          </div>

          {/* Détails de la réservation */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Récapitulatif</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-3">
                <MapPin className="w-5 h-5 text-gray-500" />
                <div>
                  <div className="font-medium">{field.name}</div>
                  <div className="text-sm text-gray-600">{field.location}</div>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <Calendar className="w-5 h-5 text-gray-500" />
                <span>{checkoutData.selectedDate.toLocaleDateString('fr-FR', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}</span>
              </div>
              
              <div className="flex items-center space-x-3">
                <Clock className="w-5 h-5 text-gray-500" />
                <span>{checkoutData.selectedStartTime} - {checkoutData.selectedEndTime}</span>
              </div>

              <div className="flex items-center space-x-3">
                <User className="w-5 h-5 text-gray-500" />
                <span>{checkoutData.playerCount} joueur(s)</span>
              </div>
              
              <div className="flex items-center justify-between border-t pt-4">
                <span className="font-medium text-lg">Prix total</span>
                <span className="text-2xl font-bold text-green-600">
                  {checkoutData.totalPrice.toLocaleString()} XOF
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Informations propriétaire */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Propriétaire du terrain</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center space-x-3">
                <User className="w-5 h-5 text-gray-500" />
                <span className="font-medium">{field.profiles.full_name}</span>
              </div>
              {field.profiles.phone && (
                <div className="flex items-center space-x-3">
                  <Phone className="w-5 h-5 text-gray-500" />
                  <span>{field.profiles.phone}</span>
                </div>
              )}
              {field.profiles.email && (
                <div className="flex items-center space-x-3">
                  <Mail className="w-5 h-5 text-gray-500" />
                  <span>{field.profiles.email}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Demandes spéciales */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Demandes spéciales (optionnel)</CardTitle>
            </CardHeader>
            <CardContent>
              <Label htmlFor="special-requests">
                Avez-vous des demandes particulières pour cette réservation ?
              </Label>
              <Textarea
                id="special-requests"
                placeholder="Ex: Matériel supplémentaire, instructions d'accès, etc."
                value={specialRequests}
                onChange={(e) => setSpecialRequests(e.target.value)}
                className="mt-2"
                rows={3}
              />
            </CardContent>
          </Card>

          {/* Instructions de paiement */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Mode de paiement</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">
                  💰 Paiement direct au propriétaire
                </h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Le paiement se fait directement au propriétaire du terrain</li>
                  <li>• Vous pouvez payer en espèces ou par mobile money</li>
                  <li>• Le propriétaire confirmera votre réservation après validation</li>
                  <li>• Vous recevrez un code de confirmation à présenter sur place</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Bouton de confirmation */}
          <Button 
            onClick={() => createBookingMutation.mutate()}
            disabled={createBookingMutation.isPending}
            className="w-full bg-green-600 hover:bg-green-700"
            size="lg"
          >
            {createBookingMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Création en cours...
              </>
            ) : (
              "Confirmer la réservation"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
