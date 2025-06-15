
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Calendar, Clock, User, MapPin, DollarSign, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import BookingConfirmationCard from './BookingConfirmationCard';
import SmartConfirmationInfo from './SmartConfirmationInfo';

interface OwnerBookingsProps {
  ownerId: string;
}

const OwnerBookings: React.FC<OwnerBookingsProps> = ({ ownerId }) => {
  const { toast } = useToast();

  const { data: bookings, isLoading, refetch } = useQuery({
    queryKey: ['owner-bookings', ownerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          profiles!inner(full_name, email),
          fields!inner(name, location, owner_id)
        `)
        .eq('fields.owner_id', ownerId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!ownerId
  });

  const handleApproveBooking = async (bookingId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('approve-booking', {
        body: { booking_id: bookingId }
      });

      if (error) throw error;

      toast({
        title: "Réservation approuvée",
        description: "Le client a reçu un lien de paiement sécurisé.",
      });

      refetch();
    } catch (error: any) {
      console.error('Erreur approbation:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'approuver la réservation",
        variant: "destructive"
      });
    }
  };

  const getStatusBadge = (status: string, escrowStatus?: string, windowType?: string) => {
    switch (status) {
      case 'pending_approval':
        return <Badge variant="secondary">En attente d'approbation</Badge>;
      case 'approved':
        return <Badge variant="outline">Approuvé - En attente de paiement</Badge>;
      case 'confirmed':
        if (escrowStatus === 'funds_held') {
          const urgentTypes = ['express', 'short'];
          const isUrgent = urgentTypes.includes(windowType || '');
          return (
            <Badge className={isUrgent ? "bg-orange-600" : "bg-blue-600"}>
              {isUrgent ? 'URGENT - Confirmation requise' : 'Payé - Confirmation requise'}
            </Badge>
          );
        }
        return <Badge className="bg-blue-600">Confirmé</Badge>;
      case 'owner_confirmed':
        return <Badge className="bg-green-600">Confirmé par vous</Badge>;
      case 'completed':
        return <Badge className="bg-green-600">Terminé</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Annulé</Badge>;
      case 'refunded':
        return <Badge variant="destructive">Remboursé</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Séparer les réservations qui nécessitent une confirmation
  const pendingConfirmations = bookings?.filter(booking => 
    booking.status === 'confirmed' && 
    booking.escrow_status === 'funds_held' && 
    !booking.owner_confirmed_at
  ) || [];

  const otherBookings = bookings?.filter(booking => 
    !(booking.status === 'confirmed' && 
      booking.escrow_status === 'funds_held' && 
      !booking.owner_confirmed_at)
  ) || [];

  // Trier les confirmations par urgence
  const sortedPendingConfirmations = pendingConfirmations.sort((a, b) => {
    const urgentTypes = ['express', 'short'];
    const aUrgent = urgentTypes.includes(a.confirmation_window_type || '');
    const bUrgent = urgentTypes.includes(b.confirmation_window_type || '');
    
    if (aUrgent && !bUrgent) return -1;
    if (!aUrgent && bUrgent) return 1;
    
    // Si même urgence, trier par deadline
    const aDeadline = new Date(a.confirmation_deadline || 0);
    const bDeadline = new Date(b.confirmation_deadline || 0);
    return aDeadline.getTime() - bDeadline.getTime();
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                <div className="h-6 bg-gray-200 rounded w-2/3"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Section des confirmations requises */}
      {sortedPendingConfirmations.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-yellow-600" />
            <span>Confirmations requises ({sortedPendingConfirmations.length})</span>
          </h3>
          <div className="space-y-4">
            {sortedPendingConfirmations.map((booking) => (
              <BookingConfirmationCard
                key={booking.id}
                booking={booking}
                onConfirm={() => refetch()}
              />
            ))}
          </div>
        </div>
      )}

      {/* Section des autres réservations */}
      <div>
        <h3 className="text-lg font-semibold mb-4">
          Toutes les réservations ({otherBookings.length})
        </h3>
        <div className="space-y-4">
          {otherBookings.map((booking) => (
            <Card key={booking.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{booking.fields.name}</CardTitle>
                  {getStatusBadge(booking.status, booking.escrow_status, booking.confirmation_window_type)}
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Afficher les infos de confirmation intelligente si disponibles */}
                {booking.confirmation_window_type && (
                  <SmartConfirmationInfo booking={booking} />
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <User className="w-4 h-4 text-gray-500" />
                    <span>{booking.profiles.full_name}</span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <MapPin className="w-4 h-4 text-gray-500" />
                    <span>{booking.fields.location}</span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <span>{format(new Date(booking.booking_date), 'dd/MM/yyyy', { locale: fr })}</span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-gray-500" />
                    <span>{booking.start_time.slice(0, 5)} - {booking.end_time.slice(0, 5)}</span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <DollarSign className="w-4 h-4 text-gray-500" />
                    <span>{booking.total_price.toLocaleString()} XOF</span>
                  </div>
                  
                  {booking.player_count && (
                    <div className="flex items-center space-x-2">
                      <User className="w-4 h-4 text-gray-500" />
                      <span>{booking.player_count} joueurs</span>
                    </div>
                  )}
                </div>

                {booking.special_requests && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <h4 className="font-medium text-gray-900 mb-1">Demandes spéciales :</h4>
                    <p className="text-gray-600 text-sm">{booking.special_requests}</p>
                  </div>
                )}

                {booking.status === 'pending_approval' && (
                  <div className="flex space-x-2">
                    <Button 
                      onClick={() => handleApproveBooking(booking.id)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      Approuver
                    </Button>
                    <Button variant="outline">
                      Refuser
                    </Button>
                  </div>
                )}

                {booking.escrow_status && booking.escrow_status !== 'none' && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-blue-900">Statut Escrow :</span>
                      <Badge variant="outline" className="text-blue-700">
                        {booking.escrow_status === 'funds_held' ? 'Fonds sécurisés' :
                         booking.escrow_status === 'transferred' ? 'Transféré' :
                         booking.escrow_status === 'refunded' ? 'Remboursé' : booking.escrow_status}
                      </Badge>
                    </div>
                    {booking.owner_amount && (
                      <div className="text-sm text-blue-800 mt-1">
                        Votre part : {booking.owner_amount.toLocaleString()} XOF
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          {otherBookings.length === 0 && sortedPendingConfirmations.length === 0 && (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-gray-500">Aucune réservation pour le moment</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default OwnerBookings;
