
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
import { Calendar, Clock, Users, CreditCard, AlertCircle, Loader2 } from 'lucide-react';

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
      console.log('🚀 Phase 2 - Démarrage mutation avec données:', {
        fieldId,
        fieldName,
        pricePerHour,
        selectedDate: selectedDate.toISOString(),
        selectedTime,
        duration: parseInt(duration),
        playerCount: parseInt(playerCount)
      });
      
      if (!user) {
        console.error('❌ Utilisateur non connecté');
        throw new Error('Vous devez être connecté pour effectuer une réservation');
      }

      console.log('✅ Utilisateur authentifié:', user.id);

      // CORRECTION MAJEURE : Calcul correct du prix total
      const startTime = selectedTime;
      const startHour = parseInt(startTime.split(':')[0]);
      const durationNum = parseInt(duration);
      const endHour = startHour + durationNum;
      const endTime = `${endHour.toString().padStart(2, '0')}:00`;
      
      // Prix correct = prix par heure × nombre d'heures
      const correctTotalPrice = pricePerHour * durationNum;
      const platformFee = Math.round(correctTotalPrice * 0.05); // 5% de commission
      const ownerAmount = correctTotalPrice - platformFee;

      console.log('💰 CORRECTION - Calcul prix correct:', {
        pricePerHour,
        duration: durationNum,
        correctTotalPrice,
        platformFee,
        ownerAmount,
        anciensProblemes: 'Prix était fixé à 1.00 XOF'
      });

      // Créer la réservation avec le bon prix
      console.log('📝 Création réservation avec prix corrigé...');
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .insert({
          field_id: fieldId,
          user_id: user.id,
          booking_date: selectedDate.toISOString().split('T')[0],
          start_time: startTime,
          end_time: endTime,
          player_count: parseInt(playerCount),
          total_price: correctTotalPrice, // PRIX CORRIGÉ
          platform_fee: platformFee,
          owner_amount: ownerAmount,
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
        throw new Error(`Impossible de créer la réservation: ${bookingError.message}`);
      }

      console.log('✅ Réservation créée avec succès:', {
        id: booking.id,
        total_price: booking.total_price,
        platform_fee: booking.platform_fee,
        owner_amount: booking.owner_amount
      });

      // Préparer les données pour le paiement CinetPay avec le bon montant
      const paymentRequestData = {
        booking_id: booking.id,
        amount: correctTotalPrice, // MONTANT CORRECT
        field_name: fieldName,
        date: selectedDate.toLocaleDateString('fr-FR'),
        time: `${startTime} - ${endTime}`
      };

      console.log('💳 Appel Edge Function avec données corrigées:', paymentRequestData);

      try {
        // Test de la connexion Edge Function avec timeout
        console.log('🔧 Test Edge Function avec timeout 30s...');
        
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Timeout - L\'Edge Function met trop de temps à répondre')), 30000);
        });

        const functionPromise = supabase.functions.invoke('create-cinetpay-payment', {
          body: paymentRequestData,
          headers: {
            'Content-Type': 'application/json',
          }
        });

        const { data: paymentData, error: paymentError } = await Promise.race([
          functionPromise,
          timeoutPromise
        ]) as any;

        console.log('📡 Réponse Edge Function reçue:', {
          data: paymentData,
          error: paymentError,
          hasData: !!paymentData,
          hasError: !!paymentError
        });

        if (paymentError) {
          console.error('❌ Erreur Edge Function détaillée:', {
            message: paymentError.message,
            details: paymentError.details,
            hint: paymentError.hint,
            code: paymentError.code
          });
          
          // Messages d'erreur spécifiques et utiles
          if (paymentError.message?.includes('FunctionsHttpError')) {
            throw new Error('Service de paiement temporairement indisponible. Veuillez réessayer dans quelques minutes.');
          } else if (paymentError.message?.includes('timeout')) {
            throw new Error('Le traitement du paiement prend trop de temps. Veuillez réessayer.');
          } else if (paymentError.message?.includes('not found')) {
            throw new Error('Service de paiement non configuré. Contactez le support.');
          } else {
            throw new Error(`Erreur de paiement: ${paymentError.message || 'Erreur inconnue'}`);
          }
        }

        // Vérification rigoureuse de la réponse
        if (!paymentData) {
          console.error('❌ Aucune donnée retournée par l\'Edge Function');
          throw new Error('Le service de paiement n\'a pas répondu correctement. Veuillez réessayer.');
        }

        if (!paymentData.url) {
          console.error('❌ URL de paiement manquante:', paymentData);
          throw new Error('URL de paiement non générée. Veuillez contacter le support.');
        }

        console.log('✅ URL de paiement générée avec succès:', {
          url: paymentData.url,
          transaction_id: paymentData.transaction_id,
          booking_id: booking.id,
          amount: correctTotalPrice
        });
        
        // Redirection sécurisée vers CinetPay
        console.log('🔄 Redirection vers CinetPay...');
        
        // Petite pause pour s'assurer que l'utilisateur voit le message de succès
        setTimeout(() => {
          window.location.href = paymentData.url;
        }, 1500);

        return {
          booking,
          paymentUrl: paymentData.url,
          success: true
        };

      } catch (functionError: any) {
        console.error('💥 Erreur critique lors de l\'appel Edge Function:', {
          name: functionError.name,
          message: functionError.message,
          stack: functionError.stack
        });
        
        // Gestion d'erreur améliorée avec messages utilisateur clairs
        if (functionError.message?.includes('Failed to fetch')) {
          throw new Error('Impossible de contacter le service de paiement. Vérifiez votre connexion internet et réessayez.');
        } else if (functionError.message?.includes('NetworkError')) {
          throw new Error('Erreur de réseau. Veuillez vérifier votre connexion et réessayer.');
        } else if (functionError.message?.includes('Timeout')) {
          throw new Error('Le service de paiement met trop de temps à répondre. Veuillez réessayer dans quelques minutes.');
        } else {
          throw new Error(functionError.message || 'Erreur inconnue lors du traitement du paiement. Veuillez contacter le support.');
        }
      }
    },
    onSuccess: (result) => {
      console.log('🎉 Mutation réussie - redirection en cours vers:', result?.paymentUrl);
      toast({
        title: "Redirection vers le paiement",
        description: `Vous allez être redirigé vers CinetPay pour payer ${calculateTotal().toLocaleString()} XOF`,
        duration: 2000
      });
    },
    onError: (error: any) => {
      console.error('💥 Erreur mutation finale:', {
        message: error.message,
        stack: error.stack
      });
      toast({
        title: "Erreur de réservation",
        description: error.message || "Impossible de créer la réservation. Veuillez réessayer.",
        variant: "destructive",
        duration: 5000
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('📋 Validation formulaire Phase 2:', {
      fieldId,
      fieldName,
      pricePerHour,
      selectedDate: selectedDate.toISOString(),
      selectedTime,
      duration,
      playerCount,
      calculatedTotal: calculateTotal()
    });

    // Validation améliorée
    if (!playerCount || parseInt(playerCount) < 1) {
      console.error('❌ Nombre de joueurs invalide:', playerCount);
      toast({
        title: "Erreur de validation",
        description: "Veuillez sélectionner un nombre de joueurs valide (minimum 1)",
        variant: "destructive"
      });
      return;
    }

    if (!duration || parseInt(duration) < 1) {
      console.error('❌ Durée invalide:', duration);
      toast({
        title: "Erreur de validation",
        description: "Veuillez sélectionner une durée valide",
        variant: "destructive"
      });
      return;
    }

    if (calculateTotal() <= 0) {
      console.error('❌ Prix total invalide:', calculateTotal());
      toast({
        title: "Erreur de calcul",
        description: "Le prix total calculé est invalide. Veuillez rafraîchir la page.",
        variant: "destructive"
      });
      return;
    }

    console.log('✅ Validation réussie - lancement mutation avec prix:', calculateTotal());
    createBookingAndPayMutation.mutate({});
  };

  const calculateTotal = () => {
    const durationNum = parseInt(duration || '1');
    return pricePerHour * durationNum;
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

      {/* Info diagnostic améliorée */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
        <div className="flex items-center space-x-2 mb-2">
          <AlertCircle className="w-4 h-4 text-green-600" />
          <span className="text-sm font-medium text-green-900">Phase 2 - Corrections appliquées</span>
        </div>
        <div className="text-xs text-green-800 space-y-1">
          <div>✅ Calcul prix corrigé: {pricePerHour.toLocaleString()} × {duration}h = {calculateTotal().toLocaleString()} XOF</div>
          <div>✅ Gestion d'erreur améliorée</div>
          <div>✅ Validation renforcée</div>
          <div>✅ Timeout Edge Function: 30s</div>
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

        {/* Prix total corrigé */}
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
          <div className="text-xs text-green-700 mt-1">
            Commission plateforme (5%): {Math.round(calculateTotal() * 0.05).toLocaleString()} XOF
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

      {/* Boutons avec état de chargement amélioré */}
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
              Réserver et Payer {calculateTotal().toLocaleString()} XOF
            </>
          )}
        </Button>
      </div>
    </form>
  );
};

export default BookingForm;
