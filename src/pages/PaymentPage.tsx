
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, MapPin, CreditCard, Smartphone, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import Navbar from '@/components/Navbar';

interface BookingDetails {
  id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  total_price: number;
  player_count: number;
  special_requests: string;
  status: string;
  fields: {
    name: string;
    location: string;
  };
  profiles: {
    full_name: string;
    email: string;
  };
}

const PaymentPage = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [linkExpired, setLinkExpired] = useState(false);

  useEffect(() => {
    const validateAndLoadBooking = async () => {
      if (!token) {
        navigate('/');
        return;
      }

      try {
        // Utiliser la fonction PostgreSQL pour valider le lien de paiement
        const { data: validationData, error: validationError } = await supabase
          .rpc('validate_payment_link', { p_token: token });

        if (validationError || !validationData) {
          console.error('Erreur validation lien:', validationError);
          toast({
            title: "Lien invalide",
            description: "Ce lien de paiement n'existe pas ou a expiré.",
            variant: "destructive"
          });
          setLinkExpired(true);
          setIsLoading(false);
          return;
        }

        // Le booking_id est retourné par la fonction validate_payment_link
        const bookingId = validationData;

        // Charger les détails de la réservation
        const { data: bookingData, error: bookingError } = await supabase
          .from('bookings')
          .select(`
            *,
            fields!inner(name, location),
            profiles!inner(full_name, email)
          `)
          .eq('id', bookingId)
          .eq('status', 'approved')
          .single();

        if (bookingError || !bookingData) {
          console.error('Erreur chargement réservation:', bookingError);
          toast({
            title: "Réservation introuvable",
            description: "Cette réservation n'existe pas ou n'est plus disponible pour le paiement.",
            variant: "destructive"
          });
          setLinkExpired(true);
          setIsLoading(false);
          return;
        }

        setBooking(bookingData);
      } catch (error) {
        console.error('Erreur validation lien paiement:', error);
        toast({
          title: "Erreur",
          description: "Impossible de valider le lien de paiement.",
          variant: "destructive"
        });
        setLinkExpired(true);
      } finally {
        setIsLoading(false);
      }
    };

    validateAndLoadBooking();
  }, [token, navigate, toast]);

  const handlePayment = async () => {
    if (!booking || !token) return;

    setIsProcessing(true);
    try {
      // Créer la session de paiement CinetPay
      const { data, error } = await supabase.functions.invoke('create-cinetpay-payment', {
        body: {
          booking_id: booking.id,
          amount: booking.total_price,
          field_name: booking.fields.name,
          date: format(new Date(booking.booking_date), 'dd/MM/yyyy', { locale: fr }),
          time: `${booking.start_time.slice(0, 5)} - ${booking.end_time.slice(0, 5)}`
        }
      });

      if (error) throw error;

      if (data.url) {
        // Marquer le lien comme utilisé via une requête directe
        await supabase
          .from('payment_links')
          .update({ used_at: new Date().toISOString() })
          .eq('token', token);

        // Ouvrir CinetPay checkout
        window.open(data.url, '_blank');
        
        toast({
          title: "Redirection vers CinetPay",
          description: "Votre réservation sera confirmée après le paiement.",
        });
      }
    } catch (error: any) {
      console.error('Erreur lors du paiement:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de traiter le paiement",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

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

  if (linkExpired || !booking) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-md mx-auto">
            <Card>
              <CardContent className="py-8 text-center">
                <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
                <h2 className="text-xl font-semibold mb-2">Lien expiré</h2>
                <p className="text-gray-600 mb-4">
                  Ce lien de paiement n'est plus valide ou a expiré.
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
        <div className="max-w-md mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-center">Finaliser votre réservation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Détails de la réservation */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div className="flex items-center space-x-2">
                  <MapPin className="w-4 h-4 text-gray-500" />
                  <div>
                    <div className="font-medium">{booking.fields.name}</div>
                    <div className="text-sm text-gray-600">{booking.fields.location}</div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <span>{format(new Date(booking.booking_date), 'EEEE dd MMMM yyyy', { locale: fr })}</span>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-gray-500" />
                  <span>{booking.start_time.slice(0, 5)} - {booking.end_time.slice(0, 5)}</span>
                </div>
                
                <div className="flex items-center justify-between border-t pt-3">
                  <div className="flex items-center space-x-2">
                    <CreditCard className="w-4 h-4 text-green-600" />
                    <span className="font-medium">Prix total</span>
                  </div>
                  <span className="text-xl font-bold text-green-600">
                    {booking.total_price.toLocaleString()} XOF
                  </span>
                </div>
              </div>

              {/* Moyens de paiement */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <h4 className="font-medium text-green-900 mb-2 flex items-center">
                  <Smartphone className="w-4 h-4 mr-2" />
                  Moyens de paiement acceptés
                </h4>
                <div className="grid grid-cols-2 gap-2 text-sm text-green-800">
                  <div>• Orange Money</div>
                  <div>• MTN Money</div>
                  <div>• Moov Money</div>
                  <div>• Cartes bancaires</div>
                </div>
              </div>

              {/* Statut approuvé */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="text-center">
                  <div className="text-blue-900 font-medium mb-1">
                    ✅ Réservation approuvée par le propriétaire
                  </div>
                  <div className="text-sm text-blue-800">
                    Effectuez le paiement pour confirmer définitivement votre réservation
                  </div>
                </div>
              </div>

              {/* Bouton de paiement */}
              <Button 
                onClick={handlePayment}
                disabled={isProcessing}
                className="w-full bg-green-600 hover:bg-green-700"
                size="lg"
              >
                {isProcessing ? "Redirection..." : "Payer maintenant avec CinetPay"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PaymentPage;
