
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, MapPin, CreditCard, Smartphone, AlertCircle, CheckCircle } from 'lucide-react';
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
        // Pour le moment, on simule la validation du token
        // En production, il faudrait une vraie table payment_links
        const bookingId = token; // Temporaire : on utilise le token comme booking ID
        
        // Charger les détails de la réservation
        const { data: bookingData, error: bookingError } = await supabase
          .from('bookings')
          .select(`
            *,
            fields!inner(name, location),
            profiles!inner(full_name, email)
          `)
          .eq('id', bookingId)
          .in('status', ['pending', 'provisional', 'confirmed'])
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
      // Simuler le processus de paiement
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mettre à jour le statut de la réservation
      const { error } = await supabase
        .from('bookings')
        .update({ 
          status: 'confirmed',
          payment_status: 'completed'
        })
        .eq('id', booking.id);

      if (error) throw error;
      
      toast({
        title: "Paiement réussi",
        description: "Votre réservation a été confirmée avec succès.",
      });

      // Rediriger vers la page de succès
      navigate('/booking-success');
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

  // Afficher un message selon le statut de la réservation
  if (booking.status === 'confirmed') {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-md mx-auto">
            <Card>
              <CardContent className="py-8 text-center">
                <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-600" />
                <h2 className="text-xl font-semibold mb-2">Réservation confirmée !</h2>
                <p className="text-gray-600 mb-4">
                  Votre réservation est confirmée ! Vous la retrouverez dans "Mes réservations".
                </p>
                <Button onClick={() => navigate('/mes-reservations')}>
                  Voir mes réservations
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (booking.status === 'provisional') {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-md mx-auto">
            <Card>
              <CardContent className="py-8 text-center">
                <Clock className="w-12 h-12 mx-auto mb-4 text-yellow-500" />
                <h2 className="text-xl font-semibold mb-2">Paiement en cours...</h2>
                <p className="text-gray-600 mb-4">
                  Merci de patienter. Votre paiement est en cours de traitement.
                </p>
                <Button onClick={() => navigate('/mes-reservations')}>
                  Voir mes réservations
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

              {/* Bouton de paiement */}
              <Button 
                onClick={handlePayment}
                disabled={isProcessing}
                className="w-full bg-green-600 hover:bg-green-700"
                size="lg"
              >
                {isProcessing ? "Traitement..." : "Payer maintenant"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PaymentPage;
