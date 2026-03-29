
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
import { useActivePromosForField } from '@/hooks/useActivePromosForField';
import { usePromoForSlot } from '@/hooks/usePromoForSlot';
import { Button } from '@/components/ui/button';
import { Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { getBaseUrl } from '@/lib/config';
import type { FieldPricing } from '@/types/pricing';
import { calculatePublicPrice, calculateGuaranteeBreakdown } from '@/utils/publicPricing';
import PaymentTypeSelector from './PaymentTypeSelector';

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
  pricing: FieldPricing;
  availableSlots: AvailabilitySlot[];
  isLoading: boolean;
  onTimeSlotSelect: (date: Date, startTime: string, endTime: string, subtotal: number, serviceFee: number, total: number, promoId?: string, discountAmount?: number, paymentType?: 'full' | 'deposit', guaranteeBreakdown?: ReturnType<typeof calculateGuaranteeBreakdown>) => void;
  guaranteeEnabled?: boolean;
  guaranteePercentage?: number;
  paymentMode?: 'full' | 'guarantee' | 'both';
}

const SlotBookingInterface: React.FC<SlotBookingInterfaceProps> = ({
  selectedDate,
  fieldId,
  pricing,
  availableSlots,
  isLoading,
  onTimeSlotSelect,
  guaranteeEnabled = false,
  guaranteePercentage = 20,
  paymentMode = 'full'
}) => {
  const [selectedStartTime, setSelectedStartTime] = useState<string>('');
  const [selectedEndTime, setSelectedEndTime] = useState<string>('');
  const [unavailableSlots, setUnavailableSlots] = useState<string[]>([]);
  const [occupiedSlots, setOccupiedSlots] = useState<string[]>([]);
  const [isCreatingCagnotte, setIsCreatingCagnotte] = useState(false);
  const [showCagnotteConfig, setShowCagnotteConfig] = useState(false);
  // État du type de paiement : 'full' ou 'deposit'
  const [paymentType, setPaymentType] = useState<'full' | 'deposit'>(
    paymentMode === 'guarantee' ? 'deposit' : 'full'
  );
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  // Utiliser le hook temps réel pour les réservations
  const dateStr = format(selectedDate, 'yyyy-MM-dd');
  const { bookedSlotsByDate, bookingsByDate } = useBookingData(fieldId, dateStr, dateStr);
  
  // Récupérer les créneaux récurrents
  const { recurringSlots = [] } = useRecurringSlots(fieldId);

  // Récupérer les promos actives pour ce terrain
  const { data: activePromos } = useActivePromosForField(fieldId);

  // Convertir les données du hook au format attendu
  const bookedSlots = Array.from(bookedSlotsByDate[dateStr] || []);
  const bookings = bookingsByDate[dateStr] || [];

  // Debug: Afficher les informations reçues
  console.log('🔍 SlotBookingInterface - Date sélectionnée:', dateStr);
  console.log('🔍 SlotBookingInterface - Field ID:', fieldId);
  console.log('🔍 SlotBookingInterface - Créneaux reçus:', availableSlots.length);
  console.log('🔍 SlotBookingInterface - Créneaux réservés (temps réel):', bookedSlots);

  // Calculer les créneaux occupés (réservations en ligne + manuelles) et indisponibles (maintenance)
  useEffect(() => {
    // Identifier les créneaux réservés manuellement
    const manualReservedSlots = availableSlots
      .filter(slot => !slot.is_available && slot.unavailability_reason === 'Réservé manuellement')
      .map(slot => `${normalizeTime(slot.start_time)}-${normalizeTime(slot.end_time)}`);
    
    // Fusionner avec les réservations en ligne pour les afficher tous comme "occupés"
    const allOccupiedSlots = [...new Set([...bookedSlots, ...manualReservedSlots])];
    setOccupiedSlots(allOccupiedSlots);
    
    // Calculer les créneaux indisponibles (maintenance, etc.) - exclure les réservations manuelles
    const unavailable = availableSlots
      .filter(slot => !slot.is_available && slot.unavailability_reason !== 'Réservé manuellement')
      .filter(slot => {
        const slotKey = `${normalizeTime(slot.start_time)}-${normalizeTime(slot.end_time)}`;
        return !allOccupiedSlots.includes(slotKey);
      })
      .map(slot => `${normalizeTime(slot.start_time)}-${normalizeTime(slot.end_time)}`);
    
    console.log('🔍 Créneaux occupés (en ligne + manuels):', allOccupiedSlots);
    console.log('🔍 Créneaux indisponibles (maintenance):', unavailable);
    setUnavailableSlots(unavailable);
  }, [availableSlots, bookedSlots]);

  // Réinitialiser l'heure de fin quand l'heure de début change
  useEffect(() => {
    if (selectedStartTime) {
      setSelectedEndTime('');
    }
  }, [selectedStartTime, availableSlots]);

  // Initialize utility classes
  const validator = new SlotValidationLogic(availableSlots, occupiedSlots, bookings, recurringSlots, dateStr);
  const priceCalculator = new SlotPriceCalculator(pricing);

  const rangeIsAvailable = validator.isRangeAvailable(selectedStartTime, selectedEndTime);

  // Calculer le prix PUBLIC initial (sans promo)
  const publicPriceBeforePromo = priceCalculator.calculateTotalPrice(selectedStartTime, selectedEndTime);

  // Vérifier si une promo automatique s'applique au créneau sélectionné
  const promoResult = usePromoForSlot(
    activePromos,
    selectedDate,
    selectedStartTime,
    publicPriceBeforePromo
  );

  // Prix après application de la promo (si applicable)
  const publicPrice = promoResult.isEligible ? promoResult.publicPriceAfter : publicPriceBeforePromo;

  // Calculer les frais opérateurs (3% du prix public après promo)
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

  // Calculer le prix NET propriétaire (pour la garantie)
  const netPriceOwner = pricing.net_price_1h
    ? (() => {
        if (durationMinutes === 60) return pricing.net_price_1h!;
        if (durationMinutes === 90 && pricing.net_price_1h30) return pricing.net_price_1h30;
        if (durationMinutes === 120 && pricing.net_price_2h) return pricing.net_price_2h;
        return Math.floor(pricing.net_price_1h! * durationHoursFloat);
      })()
    : 0;

  // Calcul de la garantie si applicable
  const guaranteeBreakdown = (paymentMode !== 'full' && netPriceOwner > 0)
    ? calculateGuaranteeBreakdown(netPriceOwner, guaranteePercentage / 100)
    : null;

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
              occupiedSlots={occupiedSlots} 
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
              bookedSlots={occupiedSlots}
              bookings={bookings}
              selectedDate={selectedDate}
              recurringSlots={recurringSlots}
            />

            {/* Sélecteur de mode de paiement (visible si 'both' ou 'guarantee') */}
            {paymentMode !== 'full' && selectedStartTime && selectedEndTime && rangeIsAvailable && guaranteeBreakdown && (
              <PaymentTypeSelector
                paymentMode={paymentMode}
                guaranteePercentage={guaranteePercentage / 100}
                netPriceOwner={netPriceOwner}
                publicPrice={publicPrice}
                onPaymentTypeChange={setPaymentType}
                selectedType={paymentType}
                fullTotal={finalTotal}
                depositTotal={guaranteeBreakdown?.totalOnline || 0}
              />
            )}

            <BookingSummary
              selectedStartTime={selectedStartTime}
              selectedEndTime={selectedEndTime}
              subtotal={paymentType === 'deposit' && guaranteeBreakdown ? guaranteeBreakdown.depositPublic : publicPrice}
              serviceFee={paymentType === 'deposit' && guaranteeBreakdown ? guaranteeBreakdown.operatorFee : operatorFee}
              total={paymentType === 'deposit' && guaranteeBreakdown ? guaranteeBreakdown.totalOnline : finalTotal}
              fieldPrice={
                pricing.public_price_1h ?? (pricing.price_per_hour ? calculatePublicPrice(pricing.price_per_hour) : 0)
              }
              price1h30={
                pricing.public_price_1h30 ?? (pricing.price_1h30 ? calculatePublicPrice(pricing.price_1h30) : undefined)
              }
              price2h={
                pricing.public_price_2h ?? (pricing.price_2h ? calculatePublicPrice(pricing.price_2h) : undefined)
              }
              durationMinutes={durationMinutes}
              rangeIsAvailable={rangeIsAvailable}
              durationDisplay={durationDisplay}
              promo={promoResult.isEligible ? {
                discountLabel: promoResult.discountLabel,
                savings: promoResult.customerSavings
              } : null}
              originalSubtotal={promoResult.isEligible ? promoResult.publicPriceBefore : undefined}
              paymentType={paymentType}
              depositPublic={guaranteeBreakdown?.depositPublic}
              balanceCash={guaranteeBreakdown?.balanceCash}
            />

            <SlotBookingActions
              selectedDate={selectedDate}
              selectedStartTime={selectedStartTime}
              selectedEndTime={selectedEndTime}
              availableSlots={availableSlots}
              bookedSlots={occupiedSlots}
              bookings={bookings}
              recurringSlots={recurringSlots}
              fieldPrice={
                pricing.public_price_1h ?? (pricing.price_per_hour ? calculatePublicPrice(pricing.price_per_hour) : 0)
              }
              price1h30={
                pricing.public_price_1h30 ?? (pricing.price_1h30 ? calculatePublicPrice(pricing.price_1h30) : undefined)
              }
              price2h={
                pricing.public_price_2h ?? (pricing.price_2h ? calculatePublicPrice(pricing.price_2h) : undefined)
              }
              promoDiscount={promoResult.isEligible ? promoResult.customerSavings : 0}
              promoId={promoResult.isEligible ? promoResult.promo?.id : undefined}
              onTimeSlotSelect={onTimeSlotSelect}
              paymentType={paymentType}
              guaranteeBreakdown={guaranteeBreakdown}
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
              onConfirm={async (teamASize, teamBSize, teamAName, teamBName) => {
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

                  // Préparer le payload RPC avec les tailles et noms d'équipes
                  const payload = {
                    p_field_id: fieldId,
                    p_slot_date: format(selectedDate, 'yyyy-MM-dd'),
                    p_slot_start_time: selectedStartTime,
                    p_slot_end_time: selectedEndTime,
                    p_total_amount: total,
                    p_teama_size: teamASize,
                    p_teamb_size: teamBSize,
                    p_teama_name: teamAName || 'Équipe A',
                    p_teamb_name: teamBName || 'Équipe B',
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

                  // Vérifier si la fonction a retourné success: false
                  if (data?.success === false) {
                    console.error('❌ create_cagnotte returned error:', data);
                    setIsCreatingCagnotte(false);
                    toast({
                      title: data.error || "Erreur",
                      description: data.message || "Impossible de créer la cagnotte",
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
