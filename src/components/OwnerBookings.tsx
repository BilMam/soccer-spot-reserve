
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Users, MapPin, CheckCircle, XCircle, Clock4, CreditCard } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Booking {
  booking_id: string;
  field_name: string;
  user_name: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  status: string;
  total_price: number;
  player_count: number;
}

interface OwnerBookingsProps {
  ownerId: string;
}

const OwnerBookings = ({ ownerId }: OwnerBookingsProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { data: bookings, isLoading, refetch } = useQuery({
    queryKey: ['owner-bookings', ownerId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_owner_recent_bookings', {
        owner_uuid: ownerId
      });

      if (error) throw error;
      return data as Booking[];
    },
    enabled: !!ownerId
  });

  const approveBookingMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      const { data, error } = await supabase.functions.invoke('approve-booking', {
        body: { booking_id: bookingId }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: "Réservation approuvée",
        description: "Un lien de paiement a été envoyé au client par email.",
      });
      refetch();
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'approuver la réservation",
        variant: "destructive"
      });
    }
  });

  const rejectBookingMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('id', bookingId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Réservation refusée",
        description: "La demande de réservation a été refusée.",
      });
      refetch();
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible de refuser la réservation",
        variant: "destructive"
      });
    }
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending_approval':
        return <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">En attente d'approbation</Badge>;
      case 'approved':
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Approuvée (en attente de paiement)</Badge>;
      case 'confirmed':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Confirmée</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">En attente</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Annulée</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending_approval':
        return <Clock4 className="w-4 h-4 text-orange-600" />;
      case 'approved':
        return <CreditCard className="w-4 h-4 text-blue-600" />;
      case 'confirmed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'pending':
        return <Clock4 className="w-4 h-4 text-yellow-600" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Clock4 className="w-4 h-4 text-gray-400" />;
    }
  };

  const filteredBookings = bookings?.filter(booking => 
    statusFilter === 'all' || booking.status === statusFilter
  ) || [];

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Réservations récentes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Réservations récentes</CardTitle>
          <div className="flex space-x-2">
            <Button
              variant={statusFilter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('all')}
            >
              Toutes
            </Button>
            <Button
              variant={statusFilter === 'pending_approval' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('pending_approval')}
            >
              À approuver
            </Button>
            <Button
              variant={statusFilter === 'approved' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('approved')}
            >
              Approuvées
            </Button>
            <Button
              variant={statusFilter === 'confirmed' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('confirmed')}
            >
              Confirmées
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filteredBookings.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>Aucune réservation trouvée</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Terrain</TableHead>
                <TableHead>Date & Heure</TableHead>
                <TableHead>Joueurs</TableHead>
                <TableHead>Prix</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBookings.map((booking) => (
                <TableRow key={booking.booking_id}>
                  <TableCell className="font-medium">
                    {booking.user_name || 'Client anonyme'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      <span>{booking.field_name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span>{new Date(booking.booking_date).toLocaleDateString('fr-FR')}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span>{booking.start_time} - {booking.end_time}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Users className="w-4 h-4 text-gray-400" />
                      <span>{booking.player_count || 'Non spécifié'}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">
                    {booking.total_price.toLocaleString()} XOF
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(booking.status)}
                      {getStatusBadge(booking.status)}
                    </div>
                  </TableCell>
                  <TableCell>
                    {booking.status === 'pending_approval' && (
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          onClick={() => approveBookingMutation.mutate(booking.booking_id)}
                          disabled={approveBookingMutation.isPending}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          Approuver
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => rejectBookingMutation.mutate(booking.booking_id)}
                          disabled={rejectBookingMutation.isPending}
                        >
                          Refuser
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default OwnerBookings;
