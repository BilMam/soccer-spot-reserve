
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { normalizeTime } from '@/utils/timeUtils';
import { SlotValidationLogic } from './SlotValidationLogic';
import { SlotPriceCalculator } from './SlotPriceCalculator';
import OccupiedSlotsDisplay from './OccupiedSlotsDisplay';
import TimeSlotSelector from './TimeSlotSelector';
import BookingSummary from './BookingSummary';
import SlotBookingActions from './SlotBookingActions';
import { CagnotteConfigDialog } from './CagnotteConfigDialog';
import { useBookingData } from '@/hooks/useBookingData';
import { useRecurringSlots } from '@/hooks/useRecurringSlots';
import { useAvailableTimesForDate } from '@/hooks/useAvailableTimesForDate';
import { Button } from '@/components/ui/button';
import { Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { getBaseUrl } from '@/lib/config';

interface AvailabilitySlot {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  is_available: boolean;
  on_hold_until?: string | null;
  hold_cagnotte_id?: string | null;
  price_override?: number;
  unavailability_reason?: string;
  is_maintenance?: boolean;
  notes?: string;
}

interface SlotBookingInterfaceProps {
  selectedDate: Date;
  fieldId: string;
  fieldPrice: number;
  price1h30?: number | null;
  price2h?: number | null;
  availableSlots: AvailabilitySlot[];
  isLoading: boolean;
  onTimeSlotSelect: (date: Date, startTime: string, endTime: string, subtotal: number, serviceFee: number, total: number) => void;
}

const SlotBookingInterface: React.FC<SlotBookingInterfaceProps> = ({
  selectedDate,
  fieldId,
  fieldPrice,
  price1h30,
  price2h,
  availableSlots,
  isLoading,
  onTimeSlotSelect
}) => {
  const [selectedStartTime, setSelectedStartTime] = useState<string>('');
  const [selectedEndTime, setSelectedEndTime] = useState<string>('');
  const [unavailableSlots, setUnavailableSlots] = useState<string[]>([]);
  const [isCreatingCagnotte, setIsCreatingCagnotte] = useState(false);
  const [showCagnotteConfig, setShowCagnotteConfig] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  // Utiliser le hook temps réel pour les réservations
  const dateStr = format(selectedDate, 'yyyy-MM-dd');
  const { bookedSlotsByDate, bookingsByDate } = useBookingData(fieldId, dateStr, dateStr);
  
  // Récupérer les créneaux récurrents
  const { recurringSlots = [] } = useRecurringSlots(fieldId);
  
  // Convertir les données du hook au format attendu
  const bookedSlots = Array.from(bookedSlotsByDate[dateStr] || []);
  const bookings = bookingsByDate[dateStr] || [];

  // Debug: Afficher les informations reçues
  console.log('🔍 SlotBookingInterface - Date sélectionnée:', dateStr);
  console.log('🔍 SlotBookingInterface - Field ID:', fieldId);
  console.log('🔍 SlotBookingInterface - Créneaux reçus:', availableSlots.length);
  console.log('🔍 SlotBookingInterface - Créneaux réservés (temps réel):', bookedSlots);
  console.log('🔍 SlotBookingInterface - bookedSlotsByDate complet:', bookedSlotsByDate);
  console.log('🔍 SlotBookingInterface - bookingsByDate complet:', bookingsByDate);

  // Calculer les créneaux indisponibles (pas de réservation mais is_available = false)
  useEffect(() => {
    const unavailable = availableSlots
      .filter(slot => !slot.is_available)
      .filter(slot => {
        const slotKey = `${normalizeTime(slot.start_time)}-${normalizeTime(slot.end_time)}`;
        return !bookedSlots.includes(slotKey);
      })
      .map(slot => `${normalizeTime(slot.start_time)}-${normalizeTime(slot.end_time)}`);
    
    console.log('🔍 Créneaux indisponibles trouvés:', unavailable);
    setUnavailableSlots(unavailable);
  }, [availableSlots, bookedSlots]);

  // Réinitialiser l'heure de fin quand l'heure de début change
  useEffect(() => {
    if (selectedStartTime) {
      setSelectedEndTime('');
    }
  }, [selectedStartTime, availableSlots]);

  // Initialize utility classes
  const validator = new SlotValidationLogic(availableSlots, bookedSlots, bookings, recurringSlots, dateStr);
  const priceCalculator = new SlotPriceCalculator(availableSlots, {
    price_per_hour: fieldPrice,
    price_1h30: price1h30,
    price_2h: price2h
  });

  const rangeIsAvailable = validator.isRangeAvailable(selectedStartTime, selectedEndTime);
  
  // Calculer le prix PUBLIC (déjà avec commission 3%)
  const publicPrice = priceCalculator.calculateTotalPrice(selectedStartTime, selectedEndTime);
  
  // Calculer les frais opérateurs (3% du prix public)
  const operatorFee = Math.ceil(publicPrice * 0.03);
  
  // Calculer le total final (prix public + frais opérateurs)
  const finalTotal = publicPrice + operatorFee;
  
  // Calculer durée en minutes pour l'affichage
  const startMinutes = selectedStartTime ? parseInt(selectedStartTime.split(':')[0]) * 60 + parseInt(selectedStartTime.split(':')[1]) : 0;
  const endMinutes = selectedEndTime ? parseInt(selectedEndTime.split(':')[0]) * 60 + parseInt(selectedEndTime.split(':')[1]) : 0;
  const durationMinutes = endMinutes - startMinutes;
  const durationHoursFloat = durationMinutes / 60;
  
  // Calculer l'affichage de la durée
  const durationDisplay = selectedStartTime && selectedEndTime 
    ? (() => {
        const hours = Math.floor(durationHoursFloat);
        const minutes = durationMinutes % 60;
        let display = '';
        if (hours > 0) display += `${hours}h`;
        if (minutes > 0) display += `${minutes}min`;
        return display || '0h';
      })()
    : '0h';

  // Vérifier si aucun créneau n'a été créé pour ce jour
  const hasNoSlots = availableSlots.length === 0;
  
  // Récupérer la première heure disponible depuis le hook useAvailableTimesForDate
  // utilisé dans TimeSlotSelector pour avoir la vraie première heure du jour
  const { data: availableTimesData } = useAvailableTimesForDate(fieldId, selectedDate);
  const firstAvailableTime = availableTimesData?.firstAvailableTime || null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Sélectionner les heures - {format(selectedDate, 'EEEE dd MMMM yyyy', { locale: fr })}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="space-y-4">
            <div className="h-10 bg-gray-200 rounded animate-pulse" />
            <div className="h-10 bg-gray-200 rounded animate-pulse" />
          </div>
        ) : hasNoSlots ? (
          <div className="text-center py-8 text-gray-500">
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h3 className="font-medium text-yellow-800 mb-2">
                Aucun créneau disponible
              </h3>
              <p className="text-sm text-yellow-700">
                Aucun créneau n'a été configuré pour cette date. 
                Veuillez sélectionner une autre date ou contacter le propriétaire.
              </p>
            </div>
          </div>
        ) : (
          <>
            <OccupiedSlotsDisplay 
              occupiedSlots={bookedSlots} 
              unavailableSlots={unavailableSlots}
              hasSlots={availableSlots.length > 0}
              firstAvailableTime={firstAvailableTime}
            />
            
            <TimeSlotSelector
              selectedStartTime={selectedStartTime}
              selectedEndTime={selectedEndTime}
              onStartTimeChange={setSelectedStartTime}
              onEndTimeChange={setSelectedEndTime}
              availableSlots={availableSlots}
              fieldId={fieldId}
              bookedSlots={bookedSlots}
              bookings={bookings}
              selectedDate={selectedDate}
              recurringSlots={recurringSlots}
            />

            <BookingSummary
              selectedStartTime={selectedStartTime}
              selectedEndTime={selectedEndTime}
              subtotal={publicPrice}
              serviceFee={operatorFee}
              total={finalTotal}
              fieldPrice={fieldPrice}
              price1h30={price1h30}
              price2h={price2h}
              durationMinutes={durationMinutes}
              rangeIsAvailable={rangeIsAvailable}
              durationDisplay={durationDisplay}
            />

            <SlotBookingActions
              selectedDate={selectedDate}
              selectedStartTime={selectedStartTime}
              selectedEndTime={selectedEndTime}
              availableSlots={availableSlots}
              bookedSlots={bookedSlots}
              bookings={bookings}
              recurringSlots={recurringSlots}
              fieldPrice={fieldPrice}
              price1h30={price1h30}
              price2h={price2h}
              onTimeSlotSelect={onTimeSlotSelect}
            />

            {/* Bouton Créer une cagnotte */}
            {selectedStartTime && selectedEndTime && rangeIsAvailable && (
              <Button
                type="button"
                onClick={() => setShowCagnotteConfig(true)}
                variant="outline"
                className="w-full border-primary/50 text-primary hover:bg-primary/5"
                size="lg"
                disabled={isCreatingCagnotte}
              >
                <Users className="mr-2 h-5 w-5" />
                {isCreatingCagnotte ? 'Création...' : '💰 Créer une cagnotte équipe'}
              </Button>
            )}
            
            {/* Dialog de configuration de la cagnotte */}
            <CagnotteConfigDialog
              open={showCagnotteConfig}
              onOpenChange={setShowCagnotteConfig}
              totalAmount={finalTotal}
              isCreating={isCreatingCagnotte}
              onConfirm={async (teamASize, teamBSize) => {
                if (isCreatingCagnotte) return;
                
                // Vérifier que l'utilisateur est connecté (vérification immédiate et synchrone)
                if (!user) {
                  toast({
                    title: "Connexion requise",
                    description: "Veuillez vous connecter pour créer une cagnotte.",
                    variant: "destructive"
                  });
                  navigate('/auth');
                  return;
                }
                
                setIsCreatingCagnotte(true);
                
                try {

                  // Valider le montant total
                  const total = Number(finalTotal);
                  if (!Number.isFinite(total) || total <= 0) {
                    setIsCreatingCagnotte(false);
                    toast({
                      title: "Montant invalide",
                      description: `Le montant total (${total}) n'est pas valide.`,
                      variant: "destructive"
                    });
                    return;
                  }

                  // Préparer le payload RPC avec les tailles d'équipes
                  const payload = {
                    p_field_id: fieldId,
                    p_slot_date: format(selectedDate, 'yyyy-MM-dd'),
                    p_slot_start_time: selectedStartTime,
                    p_slot_end_time: selectedEndTime,
                    p_total_amount: total,
                    p_teama_size: teamASize,
                    p_teamb_size: teamBSize,
                  };

                  console.log('📝 Creating cagnotte with payload:', payload);
                  console.log('🔄 Calling supabase.rpc("create_cagnotte")...');
                  
                  const { data, error } = await supabase.rpc('create_cagnotte', payload as any) as { data: any; error: any };

                  if (error) {
                    console.error('❌ create_cagnotte RPC error:', { error, code: error?.code, message: error?.message, details: error?.details, hint: error?.hint });
                    
                    // Messages d'erreur personnalisés selon le type
                    let errorMessage = "Impossible de créer la cagnotte";
                    let errorDescription = error.message || String(error);
                    
                    if (error.message?.includes('already has 2 active')) {
                      errorMessage = "Limite atteinte";
                      errorDescription = "Tu as déjà 2 matchs en collecte. Attends qu'ils se finalisent.";
                    } else if (error.message?.includes('not available') || error.message?.includes('indisponible')) {
                      errorMessage = "Créneau indisponible";
                      errorDescription = "Ce créneau n'est plus disponible. Choisis un autre horaire.";
                    } else if (error.code === 'PGRST116') {
                      errorMessage = "Fonction introuvable";
                      errorDescription = "La fonction create_cagnotte n'existe pas en base.";
                    }
                    
                    setIsCreatingCagnotte(false);
                    toast({
                      title: errorMessage,
                      description: errorDescription,
                      variant: "destructive"
                    });
                    return;
                  }

                  const cagnotteId = data?.cagnotte_id;
                  if (!cagnotteId) {
                    console.error('❌ No cagnotte_id in response:', data);
                    setIsCreatingCagnotte(false);
                    toast({
                      title: "Erreur interne",
                      description: "La cagnotte n'a pas renvoyé d'identifiant.",
                      variant: "destructive"
                    });
                    return;
                  }

                  console.log('✅ Cagnotte created successfully:', cagnotteId);

                  // Fermer le dialog
                  setShowCagnotteConfig(false);

                  // 🔁 NAVIGUER D'ABORD pour ne pas être bloqué par le clipboard
                  navigate(`/cagnotte/${cagnotteId}`);

                  // Copier le lien SANS bloquer la redirection
                  try {
                    const url = `${getBaseUrl()}/cagnotte/${cagnotteId}`;
                    await navigator.clipboard.writeText(url);
                    toast({
                      title: "Cagnotte créée !",
                      description: "Lien copié dans le presse-papier."
                    });
                  } catch (clipboardError) {
                    console.warn("Clipboard write failed:", clipboardError);
                    toast({
                      title: "Cagnotte créée !",
                      description: "Lien prêt sur la page suivante."
                    });
                  }
                  
                  // Réinitialiser le state après navigation (pour éviter double-click pendant transition)
                  setIsCreatingCagnotte(false);
                } catch (error: any) {
                  console.error('❌ Cagnotte creation failed (unexpected):', error);
                  setIsCreatingCagnotte(false);
                  toast({
                    title: "Erreur inattendue",
                    description: error?.message || String(error),
                    variant: "destructive"
                  });
                }
              }}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default SlotBookingInterface;
