
import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Calendar, Clock, Users, CreditCard, AlertCircle } from 'lucide-react';

interface BookingFormProps {
  fieldId: string;
  fieldName: string;
  pricePerHour: number;
  selectedDate: Date;
  selectedTime: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const BookingForm: React.FC<BookingFormProps> = ({
  fieldId,
  fieldName,
  pricePerHour,
  selectedDate,
  selectedTime,
  onSuccess,
  onCancel
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [playerCount, setPlayerCount] = useState<string>('');
  const [duration, setDuration] = useState<string>('1');
  const [specialRequests, setSpecialRequests] = useState('');

  const createBookingAndPayMutation = useMutation({
    mutationFn: async (bookingData: any) => {
      console.log('🚀 DÉBUT - Création réservation et paiement');
      
      if (!user) {
        console.error('❌ Utilisateur non connecté');
        throw new Error('Utilisateur non connecté');
      }

      console.log('✅ Utilisateur connecté:', user.id);

      const startTime = selectedTime;
      const startHour = parseInt(startTime.split(':')[0]);
      const endHour = startHour + parseInt(duration);
      const endTime = `${endHour.toString().padStart(2, '0')}:00`;
      
      // CORRECTION: Calcul correct du prix total
      const totalPrice = pricePerHour * parseInt(duration);
      const platformFee = Math.round(totalPrice * 0.05); // 5% de commission

      console.log('💰 Calcul prix:', {
        pricePerHour,
        duration,
        totalPrice,
        platformFee
      });

      // Créer la réservation
      console.log('📝 Création réservation en base...');
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .insert({
          field_id: fieldId,
          user_id: user.id,
          booking_date: selectedDate.toISOString().split('T')[0],
          start_time: startTime,
          end_time: endTime,
          player_count: parseInt(playerCount),
          total_price: totalPrice,
          platform_fee: platformFee,
          owner_amount: totalPrice - platformFee,
          special_requests: specialRequests || null,
          status: 'pending',
          payment_status: 'pending',
          escrow_status: 'none',
          currency: 'XOF'
        })
        .select()
        .single();

      if (bookingError) {
        console.error('❌ Erreur création réservation:', bookingError);
        throw bookingError;
      }

      console.log('✅ Réservation créée:', booking);

      // Préparer les données pour le paiement CinetPay
      const paymentRequestData = {
        booking_id: booking.id,
        amount: totalPrice, // Prix correct maintenant
        field_name: fieldName,
        date: selectedDate.toLocaleDateString('fr-FR'),
        time: `${startTime} - ${endTime}`
      };

      console.log('💳 Données paiement CinetPay:', paymentRequestData);

      // Test de connexion Edge Function
      console.log('🔧 Test Edge Function...');
      
      try {
        const { data: paymentData, error: paymentError } = await supabase.functions.invoke(
          'create-cinetpay-payment',
          {
            body: paymentRequestData
          }
        );

        console.log('📡 Réponse Edge Function:', {
          data: paymentData,
          error: paymentError
        });

        if (paymentError) {
          console.error('❌ Erreur Edge Function:', paymentError);
          
          // Diagnostic détaillé de l'erreur
          if (paymentError.message?.includes('FunctionsHttpError')) {
            console.error('🔥 Erreur HTTP Edge Function - vérifier déploiement');
          } else if (paymentError.message?.includes('timeout')) {
            console.error('⏱️ Timeout Edge Function');
          } else if (paymentError.message?.includes('not found')) {
            console.error('🚫 Edge Function non trouvée');
          }
          
          throw new Error(`Erreur paiement: ${paymentError.message}`);
        }

        // Vérifier la réponse
        if (!paymentData) {
          console.error('❌ Pas de données retournées par l\'Edge Function');
          throw new Error('Pas de réponse du service de paiement');
        }

        if (!paymentData.url) {
          console.error('❌ Pas d\'URL de paiement dans la réponse:', paymentData);
          throw new Error('URL de paiement manquante');
        }

        console.log('✅ URL paiement reçue:', paymentData.url);
        
        // Rediriger vers CinetPay
        window.location.href = paymentData.url;

        return booking;

      } catch (functionError: any) {
        console.error('💥 Erreur lors de l\'appel Edge Function:', functionError);
        
        // Analyser le type d'erreur
        if (functionError.message?.includes('Failed to fetch')) {
          throw new Error('Impossible de contacter le service de paiement. Vérifiez votre connexion.');
        } else if (functionError.message?.includes('NetworkError')) {
          throw new Error('Erreur réseau. Veuillez réessayer.');
        } else {
          throw new Error(`Erreur service paiement: ${functionError.message}`);
        }
      }
    },
    onSuccess: () => {
      console.log('🎉 Mutation réussie - redirection en cours');
      toast({
        title: "Redirection vers le paiement",
        description: "Vous allez être redirigé vers CinetPay pour effectuer le paiement.",
      });
    },
    onError: (error: any) => {
      console.error('💥 Erreur mutation:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de créer la réservation",
        variant: "destructive"
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('📋 Soumission formulaire avec paramètres:', {
      fieldId,
      fieldName,
      pricePerHour,
      selectedDate: selectedDate.toISOString(),
      selectedTime,
      duration,
      playerCount
    });

    if (!playerCount || parseInt(playerCount) < 1) {
      console.error('❌ Nombre de joueurs invalide');
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner le nombre de joueurs",
        variant: "destructive"
      });
      return;
    }

    console.log('✅ Validation formulaire OK - lancement mutation');
    createBookingAndPayMutation.mutate({});
  };

  const calculateTotal = () => {
    return pricePerHour * parseInt(duration || '1');
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
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
          <span>{selectedTime} - {
            (() => {
              const startHour = parseInt(selectedTime.split(':')[0]);
              const endHour = startHour + parseInt(duration || '1');
              return `${endHour.toString().padStart(2, '0')}:00`;
            })()
          }</span>
        </div>
      </div>

      {/* Diagnostic info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <div className="flex items-center space-x-2 mb-2">
          <AlertCircle className="w-4 h-4 text-blue-600" />
          <span className="text-sm font-medium text-blue-900">Mode diagnostic activé</span>
        </div>
        <div className="text-xs text-blue-800 space-y-1">
          <div>Prix/heure: {pricePerHour.toLocaleString()} XOF</div>
          <div>Durée: {duration}h</div>
          <div>Total calculé: {calculateTotal().toLocaleString()} XOF</div>
        </div>
      </div>

      {/* Formulaire */}
      <div className="space-y-4">
        <div>
          <Label htmlFor="duration">Durée (heures)</Label>
          <Select value={duration} onValueChange={setDuration}>
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner la durée" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1 heure</SelectItem>
              <SelectItem value="2">2 heures</SelectItem>
              <SelectItem value="3">3 heures</SelectItem>
              <SelectItem value="4">4 heures</SelectItem>
            </SelectContent>
          </Select>
        </div>

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
              {calculateTotal().toLocaleString()} XOF
            </span>
          </div>
          <div className="text-sm text-green-800 mt-1">
            {pricePerHour.toLocaleString()} XOF/heure × {duration} heure(s)
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
        >
          Annuler
        </Button>
        <Button
          type="submit"
          disabled={createBookingAndPayMutation.isPending}
          className="flex-1 bg-green-600 hover:bg-green-700"
        >
          {createBookingAndPayMutation.isPending ? (
            "Traitement..."
          ) : (
            <>
              <CreditCard className="w-4 h-4 mr-2" />
              Réserver et Payer
            </>
          )}
        </Button>
      </div>
    </form>
  );
};

export default BookingForm;
