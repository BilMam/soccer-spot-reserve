
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Calendar, Clock, Euro, Users, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface BookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  field: {
    id: string;
    name: string;
    location: string;
    address: string;
  };
  selectedDate: Date;
  selectedStartTime: string;
  selectedEndTime: string;
  selectedPrice: number;
}

const BookingDialog: React.FC<BookingDialogProps> = ({
  open,
  onOpenChange,
  field,
  selectedDate,
  selectedStartTime,
  selectedEndTime,
  selectedPrice
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [playerCount, setPlayerCount] = useState(2);
  const [specialRequests, setSpecialRequests] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const createBookingMutation = useMutation({
    mutationFn: async (bookingData: any) => {
      if (!user) throw new Error('Vous devez être connecté pour réserver');

      // Créer la réservation
      const { data, error } = await supabase
        .from('bookings')
        .insert({
          user_id: user.id,
          field_id: field.id,
          booking_date: format(selectedDate, 'yyyy-MM-dd'),
          start_time: selectedStartTime,
          end_time: selectedEndTime,
          total_price: selectedPrice,
          player_count: playerCount,
          special_requests: specialRequests || null,
          status: 'pending',
          payment_status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: async (booking) => {
      toast({
        title: "Réservation créée !",
        description: "Votre réservation a été créée. Procédez au paiement pour la confirmer.",
      });
      
      // Invalider les requêtes pour rafraîchir les données
      queryClient.invalidateQueries({ queryKey: ['field-availability'] });
      queryClient.invalidateQueries({ queryKey: ['user-bookings'] });
      
      // Rediriger vers le paiement Stripe
      await initiatePayment(booking);
      
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de créer la réservation",
        variant: "destructive",
      });
    }
  });

  const initiatePayment = async (booking: any) => {
    try {
      setIsProcessing(true);
      
      // Appeler la fonction Edge pour créer une session Stripe
      const { data, error } = await supabase.functions.invoke('create-payment', {
        body: {
          booking_id: booking.id,
          amount: selectedPrice * 100, // Convertir en centimes
          field_name: field.name,
          date: format(selectedDate, 'dd/MM/yyyy'),
          time: `${selectedStartTime} - ${selectedEndTime}`
        }
      });

      if (error) throw error;

      // Rediriger vers Stripe Checkout
      if (data.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      toast({
        title: "Erreur de paiement",
        description: "Impossible d'initier le paiement. Réessayez plus tard.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createBookingMutation.mutate({});
  };

  const calculateDuration = () => {
    const start = parseInt(selectedStartTime.split(':')[0]);
    const end = parseInt(selectedEndTime.split(':')[0]);
    return end - start;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Réserver ce terrain</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Résumé de la réservation */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center space-x-2">
                <MapPin className="w-4 h-4 text-gray-500" />
                <div>
                  <div className="font-medium">{field.name}</div>
                  <div className="text-sm text-gray-500">{field.location}</div>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <span>{format(selectedDate, 'EEEE dd MMMM yyyy', { locale: fr })}</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-gray-500" />
                <span>{selectedStartTime} - {selectedEndTime} ({calculateDuration()}h)</span>
              </div>
              
              <div className="flex items-center justify-between border-t pt-3">
                <div className="flex items-center space-x-2">
                  <Euro className="w-4 h-4 text-green-600" />
                  <span className="font-medium">Total</span>
                </div>
                <span className="text-lg font-bold text-green-600">{selectedPrice}€</span>
              </div>
            </CardContent>
          </Card>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="playerCount">Nombre de joueurs</Label>
              <div className="flex items-center space-x-2 mt-1">
                <Users className="w-4 h-4 text-gray-500" />
                <Input
                  id="playerCount"
                  type="number"
                  min="1"
                  max="22"
                  value={playerCount}
                  onChange={(e) => setPlayerCount(parseInt(e.target.value) || 1)}
                  className="flex-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="specialRequests">Demandes spéciales (optionnel)</Label>
              <Textarea
                id="specialRequests"
                value={specialRequests}
                onChange={(e) => setSpecialRequests(e.target.value)}
                placeholder="Équipements spéciaux, consignes particulières..."
                rows={3}
                className="mt-1"
              />
            </div>

            <div className="flex space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1"
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={createBookingMutation.isPending || isProcessing}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                {createBookingMutation.isPending || isProcessing ? "Traitement..." : "Réserver & Payer"}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BookingDialog;
