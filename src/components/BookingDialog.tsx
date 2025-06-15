
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Calendar, Clock, MapPin, Users, CreditCard } from 'lucide-react';
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
    price_per_hour: number;
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
  const [playerCount, setPlayerCount] = useState(10);
  const [specialRequests, setSpecialRequests] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Convertir le prix en XOF (approximativement 1 EUR = 656 XOF)
  const priceInXOF = Math.round(selectedPrice * 656);

  const handleBooking = async () => {
    if (!user) return;

    setIsProcessing(true);
    try {
      // Créer la réservation d'abord
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .insert({
          user_id: user.id,
          field_id: field.id,
          booking_date: selectedDate.toISOString().split('T')[0],
          start_time: selectedStartTime,
          end_time: selectedEndTime,
          total_price: priceInXOF,
          currency: 'XOF',
          player_count: playerCount,
          special_requests: specialRequests || null,
          status: 'pending',
          payment_status: 'pending'
        })
        .select()
        .single();

      if (bookingError) throw bookingError;

      // Créer la session de paiement Stripe Connect
      const { data, error } = await supabase.functions.invoke('create-connect-payment', {
        body: {
          booking_id: booking.id,
          amount: priceInXOF,
          field_name: field.name,
          date: format(selectedDate, 'dd/MM/yyyy', { locale: fr }),
          time: `${selectedStartTime} - ${selectedEndTime}`
        }
      });

      if (error) throw error;

      if (data.url) {
        // Ouvrir Stripe checkout dans un nouvel onglet
        window.open(data.url, '_blank');
        
        toast({
          title: "Redirection vers le paiement",
          description: "Votre réservation sera confirmée après le paiement.",
        });
        
        onOpenChange(false);
      }
    } catch (error: any) {
      console.error('Erreur lors de la réservation:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de créer la réservation",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Confirmer la réservation</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Détails de la réservation */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <div className="flex items-center space-x-2">
              <MapPin className="w-4 h-4 text-gray-500" />
              <div>
                <div className="font-medium">{field.name}</div>
                <div className="text-sm text-gray-600">{field.location}</div>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-gray-500" />
              <span>{format(selectedDate, 'EEEE dd MMMM yyyy', { locale: fr })}</span>
            </div>
            
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-gray-500" />
              <span>{selectedStartTime} - {selectedEndTime}</span>
            </div>
            
            <div className="flex items-center justify-between border-t pt-3">
              <div className="flex items-center space-x-2">
                <CreditCard className="w-4 h-4 text-green-600" />
                <span className="font-medium">Prix total</span>
              </div>
              <span className="text-xl font-bold text-green-600">{priceInXOF.toLocaleString()} XOF</span>
            </div>
          </div>

          {/* Nombre de joueurs */}
          <div className="space-y-2">
            <Label htmlFor="playerCount" className="flex items-center space-x-2">
              <Users className="w-4 h-4" />
              <span>Nombre de joueurs</span>
            </Label>
            <Input
              id="playerCount"
              type="number"
              min="1"
              max="22"
              value={playerCount}
              onChange={(e) => setPlayerCount(parseInt(e.target.value) || 1)}
            />
          </div>

          {/* Demandes spéciales */}
          <div className="space-y-2">
            <Label htmlFor="specialRequests">Demandes spéciales (optionnel)</Label>
            <Textarea
              id="specialRequests"
              placeholder="Équipements supplémentaires, préférences particulières..."
              value={specialRequests}
              onChange={(e) => setSpecialRequests(e.target.value)}
              rows={3}
            />
          </div>

          {/* Informations de commission */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="text-sm text-blue-800 space-y-1">
              <div className="flex justify-between">
                <span>Montant terrain :</span>
                <span>{Math.round(priceInXOF * 0.95).toLocaleString()} XOF</span>
              </div>
              <div className="flex justify-between">
                <span>Commission plateforme (5%) :</span>
                <span>{Math.round(priceInXOF * 0.05).toLocaleString()} XOF</span>
              </div>
              <div className="flex justify-between font-medium border-t pt-1">
                <span>Total à payer :</span>
                <span>{priceInXOF.toLocaleString()} XOF</span>
              </div>
            </div>
          </div>

          {/* Boutons d'action */}
          <div className="flex space-x-3">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Annuler
            </Button>
            <Button 
              onClick={handleBooking}
              disabled={isProcessing}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              {isProcessing ? "Traitement..." : "Payer et réserver"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BookingDialog;
