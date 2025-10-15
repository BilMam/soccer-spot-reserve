import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Calendar, Clock, Users, CreditCard, Loader2 } from 'lucide-react';

interface BookingFormProps {
  fieldId: string;
  fieldName: string;
  pricePerHour: number;
  selectedDate: Date;
  selectedStartTime: string;
  selectedEndTime: string;
  totalPrice: number;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const BookingForm: React.FC<BookingFormProps> = ({
  fieldId,
  fieldName,
  pricePerHour,
  selectedDate,
  selectedStartTime,
  selectedEndTime,
  totalPrice,
  onSuccess,
  onCancel
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [playerCount, setPlayerCount] = useState<string>('');
  const [specialRequests, setSpecialRequests] = useState('');

  const createBookingAndPayMutation = useMutation({
    mutationFn: async () => {
      if (!user) {
        throw new Error('Vous devez être connecté pour effectuer une réservation');
      }

      console.log('🚀 Début création réservation CinetPay...');

      // Vérifier conflits de créneaux
      const { data: conflictCheck } = await supabase.rpc('check_booking_conflict', {
        p_field_id: fieldId,
        p_booking_date: selectedDate.toISOString().split('T')[0],
        p_start_time: selectedStartTime,
        p_end_time: selectedEndTime
      });

      if (conflictCheck) {
        throw new Error('Ce créneau est déjà réservé');
      }

      // Créer la réservation
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .insert({
          field_id: fieldId,
          user_id: user.id,
          booking_date: selectedDate.toISOString().split('T')[0],
          start_time: selectedStartTime,
          end_time: selectedEndTime,
          player_count: parseInt(playerCount),
          total_price: totalPrice,
          special_requests: specialRequests || null,
          status: 'pending',
          payment_status: 'pending',
          field_price: totalPrice
        })
        .select()
        .single();

      if (bookingError || !booking) {
        console.error('❌ Erreur création réservation:', bookingError);
        throw new Error('Impossible de créer la réservation');
      }

      console.log('✅ Réservation créée:', booking.id);

      // Initier le paiement CinetPay
      console.log('💳 Initiation paiement CinetPay...');
      const { data: paymentData, error: paymentError } = await supabase.functions.invoke('create-cinetpay-payment', {
        body: {
          booking_id: booking.id,
          amount: totalPrice,
          field_name: fieldName,
          date: formatDate(selectedDate),
          time: `${selectedStartTime} - ${selectedEndTime}`
        }
      });

      if (paymentError || !paymentData?.url) {
        console.error('❌ Erreur création paiement CinetPay:', paymentError);
        throw new Error('Impossible de créer le paiement');
      }

      console.log('✅ Paiement CinetPay créé, redirection...');
      
      // Redirection vers CinetPay
      window.location.href = paymentData.url;
      
      return { booking, paymentUrl: paymentData.url };
    },
    onSuccess: () => {
      toast({
        title: "Redirection vers le paiement",
        description: `Vous allez être redirigé vers CinetPay pour payer ${totalPrice.toLocaleString()} XOF`,
        duration: 2000
      });
      onSuccess?.();
    },
    onError: (error: Error) => {
      console.error('❌ Erreur réservation/paiement:', error);
      toast({
        title: "Erreur de réservation",
        description: error.message,
        variant: "destructive",
        duration: 5000
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!playerCount || parseInt(playerCount) < 1) {
      toast({
        title: "Erreur de validation",
        description: "Veuillez sélectionner un nombre de joueurs valide (minimum 1)",
        variant: "destructive"
      });
      return;
    }

    if (totalPrice <= 0) {
      toast({
        title: "Erreur de calcul",
        description: "Le prix total calculé est invalide. Veuillez rafraîchir la page.",
        variant: "destructive"
      });
      return;
    }

    console.log('✅ Validation réussie - lancement mutation');
    createBookingAndPayMutation.mutate();
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Calculer la durée en heures pour l'affichage
  const calculateDurationHours = () => {
    const startHour = parseInt(selectedStartTime.split(':')[0]);
    const endHour = parseInt(selectedEndTime.split(':')[0]);
    return endHour - startHour;
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Résumé de la réservation */}
      <div className="bg-gray-50 rounded-lg p-4 space-y-3">
        <h3 className="font-semibold text-lg">{fieldName}</h3>
        
        <div className="flex items-center space-x-2 text-gray-600">
          <Calendar className="w-4 h-4" />
          <span>{formatDate(selectedDate)}</span>
        </div>
        
        <div className="flex items-center space-x-2 text-gray-600">
          <Clock className="w-4 h-4" />
          <span>{selectedStartTime} - {selectedEndTime}</span>
          <span className="text-sm text-gray-500">({calculateDurationHours()}h)</span>
        </div>
      </div>

      {/* Formulaire */}
      <div className="space-y-4">
        <div>
          <Label htmlFor="playerCount">Nombre de joueurs</Label>
          <div className="flex items-center space-x-2">
            <Users className="w-4 h-4 text-gray-500" />
            <Input
              id="playerCount"
              type="number"
              min="1"
              max="20"
              value={playerCount}
              onChange={(e) => setPlayerCount(e.target.value)}
              placeholder="ex: 10"
              required
            />
          </div>
        </div>

        <div>
          <Label htmlFor="specialRequests">Demandes spéciales (optionnel)</Label>
          <Textarea
            id="specialRequests"
            value={specialRequests}
            onChange={(e) => setSpecialRequests(e.target.value)}
            placeholder="Équipements supplémentaires, préférences particulières..."
            rows={3}
          />
        </div>

        {/* Prix total */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex justify-between items-center">
            <span className="font-medium">Prix total</span>
            <span className="text-xl font-bold text-green-600">
              {totalPrice.toLocaleString()} XOF
            </span>
          </div>
          <div className="text-sm text-green-800 mt-1">
            {pricePerHour.toLocaleString()} XOF/heure × {calculateDurationHours()} heure(s)
          </div>
          <div className="text-xs text-green-700 mt-1">
            Commission plateforme (3%): {Math.round(totalPrice * 0.03).toLocaleString()} XOF
          </div>
        </div>
      </div>

      {/* Processus de réservation sécurisé */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2 flex items-center">
          <CreditCard className="w-4 h-4 mr-2" />
          Processus de réservation sécurisé
        </h4>
        <ol className="text-sm text-blue-800 space-y-1">
          <li>1. Vous payez maintenant via CinetPay (sécurisé)</li>
          <li>2. Vos fonds sont protégés sur notre plateforme</li>
          <li>3. Le propriétaire confirme votre réservation</li>
          <li>4. Les fonds sont transférés au propriétaire</li>
          <li className="font-medium text-blue-900">
            💡 Remboursement automatique si pas de confirmation
          </li>
        </ol>
      </div>

      {/* Boutons */}
      <div className="flex space-x-3">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="flex-1"
          disabled={createBookingAndPayMutation.isPending}
        >
          Annuler
        </Button>
        <Button
          type="submit"
          disabled={createBookingAndPayMutation.isPending}
          className="flex-1 bg-green-600 hover:bg-green-700"
        >
          {createBookingAndPayMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Traitement en cours...
            </>
          ) : (
            <>
              <CreditCard className="w-4 h-4 mr-2" />
              Réserver et Payer {totalPrice.toLocaleString()} XOF
            </>
          )}
        </Button>
      </div>
    </form>
  );
};

export default BookingForm;