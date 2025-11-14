import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, MapPin, Clock, Users, Star, X, Clock4, CheckCircle, Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import EnhancedReviewDialog from '@/components/EnhancedReviewDialog';
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
        .in('status', ['confirmed', 'completed', 'cancelled'])
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return { badge: <Badge className="bg-blue-600">Confirmée</Badge>, icon: CheckCircle };
      case 'completed':
        return { badge: <Badge variant="secondary" className="text-gray-600">Terminée</Badge>, icon: CheckCircle };
      case 'cancelled':
        return { badge: <Badge variant="destructive">Annulée</Badge>, icon: X };
      default:
        return { badge: <Badge variant="outline">Statut inconnu</Badge>, icon: Clock4 };
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
    
    // Les réservations confirmées ne peuvent plus être annulées
    return false;
  };

  const canReview = (booking: Booking) => {
    return booking.status === 'completed' && booking.reviews.length === 0;
  };

  const handleReview = (booking: Booking) => {
    setSelectedBooking(booking);
    setReviewDialogOpen(true);
  };

  const handleReviewSubmitted = () => {
    queryClient.invalidateQueries({ queryKey: ['user-bookings', userId] });
    queryClient.invalidateQueries({ queryKey: ['user-reviews', userId] });
    setReviewDialogOpen(false);
  };

  const getStatusMessage = (status: string) => {
    switch (status) {
      case 'confirmed':
        return "Votre réservation est confirmée. Amusez-vous bien !";
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
                  const statusInfo = getStatusBadge(booking.status);
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
