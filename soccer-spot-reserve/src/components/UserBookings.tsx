import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, MapPin, Clock, Users, Star, X, Clock4, CheckCircle, Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { usePendingReviews } from '@/hooks/usePendingReviews';
import EnhancedReviewDialog from '@/components/EnhancedReviewDialog';
import PendingReviewsSection from '@/components/PendingReviewsSection';
import SmartConfirmationInfo from './SmartConfirmationInfo';

interface Booking {
  id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  total_price: number;
  status: string;
  player_count: number;
  special_requests: string;
  confirmation_window_type?: string;
  confirmation_deadline?: string;
  auto_action?: string;
  fields: {
    id: string;
    name: string;
    location: string;
    address: string;
  };
  reviews: Array<{ id: string }>;
}

interface UserBookingsProps {
  userId: string;
}

const UserBookings: React.FC<UserBookingsProps> = ({ userId }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const { pendingReviews, checkCompletedBookings, sendReviewReminder, refreshPendingReviews } = usePendingReviews();

  // Vérifier automatiquement les réservations terminées au chargement
  useEffect(() => {
    checkCompletedBookings();
  }, []);

  const { data: bookings, isLoading } = useQuery({
    queryKey: ['user-bookings', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          fields (
            id,
            name,
            location,
            address
          ),
          reviews (
            id
          )
        `)
        .eq('user_id', userId)
        .in('status', ['provisional', 'confirmed', 'completed', 'cancelled'])
        .order('booking_date', { ascending: false });

      if (error) throw error;
      return data as Booking[];
    }
  });

  const cancelBookingMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('id', bookingId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-bookings', userId] });
      toast({
        title: "Réservation annulée",
        description: "Votre réservation a été annulée avec succès.",
      });
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible d'annuler la réservation.",
        variant: "destructive",
      });
    }
  });

  const getStatusBadge = (status: string, windowType?: string) => {
    switch (status) {
      case 'provisional':
        return { badge: <Badge className="bg-yellow-500 text-white">Paiement en cours</Badge>, icon: Clock4 };
      case 'pending_approval':
        return { badge: <Badge variant="outline" className="text-orange-600">En attente d'approbation</Badge>, icon: Clock4 };
      case 'approved':
        return { badge: <Badge variant="outline" className="text-blue-600">Approuvée - En attente de paiement</Badge>, icon: CheckCircle };
      case 'confirmed':
        if (windowType === 'auto') {
          return { badge: <Badge className="bg-green-600">Confirmée automatiquement</Badge>, icon: Zap };
        }
        return { badge: <Badge className="bg-green-600">Confirmée</Badge>, icon: CheckCircle };
      case 'owner_confirmed':
        return { badge: <Badge className="bg-green-600">Confirmée par le propriétaire</Badge>, icon: CheckCircle };
      case 'completed':
        return { badge: <Badge variant="secondary" className="text-gray-600">Terminée</Badge>, icon: CheckCircle };
      case 'cancelled':
        return { badge: <Badge variant="destructive">Annulée</Badge>, icon: X };
      case 'refunded':
        return { badge: <Badge variant="destructive">Remboursée</Badge>, icon: X };
      default:
        return { badge: <Badge variant="outline">En attente</Badge>, icon: Clock4 };
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (timeString: string) => {
    return timeString.slice(0, 5);
  };

  const canCancel = (booking: Booking) => {
    const bookingDateTime = new Date(`${booking.booking_date}T${booking.start_time}`);
    const now = new Date();
    const hoursUntilBooking = (bookingDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    return (booking.status === 'pending_approval' || booking.status === 'approved' || booking.status === 'confirmed') && hoursUntilBooking > 24;
  };

  const canReview = (booking: Booking) => {
    return booking.status === 'completed' && booking.reviews.length === 0;
  };

  const handleReview = (booking: Booking) => {
    setSelectedBooking(booking);
    setReviewDialogOpen(true);
  };

  const handleReviewSubmitted = () => {
    // Invalidation immédiate et complète
    queryClient.invalidateQueries({ queryKey: ['user-bookings', userId] });
    queryClient.invalidateQueries({ queryKey: ['pending-reviews', userId] });
    queryClient.invalidateQueries({ queryKey: ['pending-reviews'] }); // Sans userId pour couvrir tous les cas
    setReviewDialogOpen(false);
    
    // Force un re-fetch immédiat des avis en attente
    checkCompletedBookings();
    refreshPendingReviews();
  };

  const handleSendReminder = (bookingId: string, fieldName: string) => {
    sendReviewReminder(bookingId, fieldName);
    toast({
      title: "Rappel envoyé",
      description: "Un rappel SMS a été envoyé si vous avez activé les notifications SMS.",
    });
  };

  const getStatusMessage = (status: string, windowType?: string, autoAction?: string) => {
    switch (status) {
      case 'provisional':
        return "Votre paiement est en cours de traitement. Vous serez redirigé vers la page de paiement.";
      case 'pending_approval':
        return "Le propriétaire examine votre demande. Vous recevrez un email dès qu'elle sera approuvée.";
      case 'approved':
        return "Votre demande a été approuvée ! Vérifiez vos emails pour le lien de paiement.";
      case 'confirmed':
        if (windowType === 'auto') {
          return "Votre réservation a été confirmée automatiquement car le créneau était proche. Amusez-vous bien !";
        }
        if (windowType === 'express' && autoAction === 'confirm') {
          return "Le propriétaire a un délai court pour confirmer. Si pas de réponse, confirmation automatique.";
        }
        return "Votre réservation est confirmée. Le propriétaire doit maintenant la valider.";
      case 'owner_confirmed':
        return "Le propriétaire a confirmé votre réservation. Amusez-vous bien !";
      case 'cancelled':
        return "Cette réservation a été annulée.";
      case 'completed':
        return "Cette réservation est terminée. Vous pouvez laisser un avis.";
      default:
        return "";
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Mes Réservations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-gray-200 h-32 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Section Avis en attente */}
        <PendingReviewsSection 
          pendingReviews={pendingReviews}
          onReviewSubmitted={handleReviewSubmitted}
          onSendReminder={handleSendReminder}
        />

        {/* Section Réservations principale */}
        <Card>
          <CardHeader>
            <CardTitle>Mes Réservations ({bookings?.length || 0})</CardTitle>
          </CardHeader>
          <CardContent>
            {!bookings || bookings.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>Aucune réservation trouvée</p>
                <p className="text-sm">Réservez votre premier terrain !</p>
              </div>
            ) : (
              <div className="space-y-4">
                {bookings.map((booking) => {
                  const statusInfo = getStatusBadge(booking.status, booking.confirmation_window_type);
                  return (
                    <div key={booking.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-semibold text-lg">{booking.fields.name}</h3>
                          <div className="flex items-center text-gray-600 text-sm mt-1">
                            <MapPin className="w-4 h-4 mr-1" />
                            {booking.fields.location}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <statusInfo.icon className="w-4 h-4" />
                          {statusInfo.badge}
                        </div>
                      </div>

                      {/* Informations de confirmation intelligente */}
                      {booking.confirmation_window_type && (
                        <div className="mb-4">
                          <SmartConfirmationInfo booking={booking} />
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 mr-2 text-gray-500" />
                          <span className="text-sm">{formatDate(booking.booking_date)}</span>
                        </div>
                        <div className="flex items-center">
                          <Clock className="w-4 h-4 mr-2 text-gray-500" />
                          <span className="text-sm">
                            {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
                          </span>
                        </div>
                        <div className="flex items-center">
                          <Users className="w-4 h-4 mr-2 text-gray-500" />
                          <span className="text-sm">{booking.player_count} joueurs</span>
                        </div>
                      </div>

                      {/* Message de statut */}
                      {getStatusMessage(booking.status, booking.confirmation_window_type, booking.auto_action) && (
                        <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-4">
                          <p className="text-sm text-blue-800">
                            {getStatusMessage(booking.status, booking.confirmation_window_type, booking.auto_action)}
                          </p>
                        </div>
                      )}

                      <div className="flex justify-between items-center">
                        <div className="text-lg font-semibold text-green-600">
                          {booking.total_price.toLocaleString()} XOF
                        </div>
                        <div className="flex space-x-2">
                          {canReview(booking) && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleReview(booking)}
                            >
                              <Star className="w-4 h-4 mr-1" />
                              Laisser un avis
                            </Button>
                          )}
                          {canCancel(booking) && (
                            <Button 
                              size="sm" 
                              variant="destructive"
                              onClick={() => cancelBookingMutation.mutate(booking.id)}
                              disabled={cancelBookingMutation.isPending}
                            >
                              <X className="w-4 h-4 mr-1" />
                              Annuler
                            </Button>
                          )}
                        </div>
                      </div>

                      {booking.special_requests && (
                        <div className="mt-3 p-2 bg-blue-50 rounded text-sm">
                          <strong>Demandes spéciales:</strong> {booking.special_requests}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <EnhancedReviewDialog
        open={reviewDialogOpen}
        onOpenChange={setReviewDialogOpen}
        booking={selectedBooking}
        onReviewSubmitted={handleReviewSubmitted}
      />
    </>
  );
};

export default UserBookings;
