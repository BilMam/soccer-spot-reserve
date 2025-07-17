
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Calendar, Clock, User, MapPin, DollarSign, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import SmartConfirmationInfo from './SmartConfirmationInfo';

interface BookingConfirmationCardProps {
  booking: any;
  onConfirm: () => void;
}

const BookingConfirmationCard: React.FC<BookingConfirmationCardProps> = ({ booking, onConfirm }) => {
  const { toast } = useToast();

  const handleConfirm = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('confirm-booking-owner', {
        body: { booking_id: booking.id }
      });

      if (error) throw error;

      toast({
        title: "Réservation confirmée !",
        description: data?.message || "Le transfert sera effectué sous 5 minutes.",
      });

      onConfirm();
    } catch (error: any) {
      console.error('Erreur confirmation:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de confirmer la réservation",
        variant: "destructive"
      });
    }
  };

  return (
    <Card className="border-2 border-yellow-200 bg-yellow-50">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-yellow-600" />
            <span>Confirmation requise</span>
          </CardTitle>
          <Badge className="bg-yellow-600 text-white">
            Paiement reçu
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Informations de confirmation intelligente */}
        <SmartConfirmationInfo booking={booking} />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center space-x-2">
            <User className="w-4 h-4 text-gray-500" />
            <span>{booking.profiles?.full_name}</span>
          </div>
          
          <div className="flex items-center space-x-2">
            <MapPin className="w-4 h-4 text-gray-500" />
            <span>{booking.fields?.name}</span>
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
          <div className="bg-white rounded-lg p-3 border">
            <h4 className="font-medium text-gray-900 mb-1">Demandes spéciales :</h4>
            <p className="text-gray-600 text-sm">{booking.special_requests}</p>
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-blue-900">Montant sécurisé :</span>
            <span className="text-lg font-semibold text-blue-900">
              {booking.total_price.toLocaleString()} XOF
            </span>
          </div>
          {booking.owner_amount && (
            <div className="text-sm text-blue-800">
              Votre part après commission : {booking.owner_amount.toLocaleString()} XOF
            </div>
          )}
        </div>

        <div className="flex space-x-3 pt-2">
          <Button 
            onClick={handleConfirm}
            className="flex-1 bg-green-600 hover:bg-green-700"
            size="lg"
          >
            ✓ Confirmer la réservation
          </Button>
          <Button 
            variant="outline" 
            className="flex-1"
            size="lg"
          >
            ✗ Refuser
          </Button>
        </div>

        <div className="text-xs text-gray-500 text-center">
          En confirmant, vous acceptez que le paiement soit transféré vers votre compte sous 5 minutes.
          {booking.confirmation_window_type !== 'auto' && booking.auto_action === 'cancel' && (
            <span className="block mt-1 text-orange-600">
              ⚠️ Sans confirmation avant l'échéance, la réservation sera automatiquement annulée et remboursée.
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default BookingConfirmationCard;
