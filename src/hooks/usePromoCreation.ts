import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface PromoWizardData {
  // Step 1: Type
  promoType: 'code' | 'automatic';
  
  // Step 2: Value
  discountType: 'percent' | 'fixed';
  discountValue: number;
  
  // Step 3: Targeting
  allFields: boolean;
  selectedFieldIds: string[];
  allSlots: boolean;
  selectedSlots: { dayOfWeek: number | null; startTime: string; endTime: string }[];
  
  // Step 4: Finalize
  name: string;
  code: string;
  usageLimitTotal: number | null;
  usageLimitPerUser: number;
  endDate: Date | null;
  minBookingAmount: number;
}

const initialWizardData: PromoWizardData = {
  promoType: 'code',
  discountType: 'percent',
  discountValue: 10,
  allFields: true,
  selectedFieldIds: [],
  allSlots: true,
  selectedSlots: [],
  name: '',
  code: '',
  usageLimitTotal: null,
  usageLimitPerUser: 1,
  endDate: null,
  minBookingAmount: 0
};

export const usePromoCreation = (ownerId: string | undefined) => {
  const [step, setStep] = useState(1);
  const [wizardData, setWizardData] = useState<PromoWizardData>(initialWizardData);
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const updateWizardData = (updates: Partial<PromoWizardData>) => {
    setWizardData(prev => ({ ...prev, ...updates }));
  };

  const nextStep = () => setStep(prev => Math.min(prev + 1, 4));
  const prevStep = () => setStep(prev => Math.max(prev - 1, 1));
  
  const resetWizard = () => {
    setStep(1);
    setWizardData(initialWizardData);
  };

  const openWizard = (prefilledData?: Partial<PromoWizardData>) => {
    resetWizard();
    if (prefilledData) {
      setWizardData(prev => ({ ...prev, ...prefilledData }));
    }
    setIsOpen(true);
  };

  const closeWizard = () => {
    setIsOpen(false);
    resetWizard();
  };

  const generateCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    updateWizardData({ code });
    return code;
  };

  const createPromoMutation = useMutation({
    mutationFn: async () => {
      if (!ownerId) throw new Error('Propriétaire non identifié');

      // 1. Créer le code promo
      const { data: promo, error: promoError } = await supabase
        .from('promo_codes')
        .insert({
          owner_id: ownerId,
          name: wizardData.name,
          code: wizardData.promoType === 'code' ? wizardData.code.toUpperCase() : null,
          discount_type: wizardData.discountType,
          discount_value: wizardData.discountValue,
          usage_limit_total: wizardData.usageLimitTotal,
          usage_limit_per_user: wizardData.usageLimitPerUser,
          start_date: new Date().toISOString().split('T')[0],
          end_date: wizardData.endDate ? wizardData.endDate.toISOString().split('T')[0] : null,
          status: 'active',
          is_automatic: wizardData.promoType === 'automatic',
          min_booking_amount: wizardData.minBookingAmount
        })
        .select()
        .single();

      if (promoError) throw promoError;

      // 2. Créer les liaisons terrains si ciblage spécifique
      if (!wizardData.allFields && wizardData.selectedFieldIds.length > 0) {
        const fieldLinks = wizardData.selectedFieldIds.map(fieldId => ({
          promo_code_id: promo.id,
          field_id: fieldId
        }));

        const { error: fieldsError } = await supabase
          .from('promo_fields')
          .insert(fieldLinks);

        if (fieldsError) throw fieldsError;
      }

      // 3. Créer les créneaux ciblés si ciblage spécifique
      if (!wizardData.allSlots && wizardData.selectedSlots.length > 0) {
        const slotLinks = wizardData.selectedSlots.map(slot => ({
          promo_code_id: promo.id,
          day_of_week: slot.dayOfWeek,
          start_time: slot.startTime,
          end_time: slot.endTime
        }));

        const { error: slotsError } = await supabase
          .from('promo_time_slots')
          .insert(slotLinks);

        if (slotsError) throw slotsError;
      }

      return promo;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promo-codes'] });
      queryClient.invalidateQueries({ queryKey: ['promo-stats'] });
      toast({
        title: "Promotion créée !",
        description: wizardData.promoType === 'code' 
          ? `Le code ${wizardData.code.toUpperCase()} est maintenant actif.`
          : "La promotion automatique est maintenant active.",
      });
      closeWizard();
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de créer la promotion",
        variant: "destructive"
      });
    }
  });

  const updatePromoMutation = useMutation({
    mutationFn: async (promoId: string) => {
      if (!ownerId) throw new Error('Propriétaire non identifié');

      // Update promo code
      const { error: updateError } = await supabase
        .from('promo_codes')
        .update({
          name: wizardData.name,
          discount_type: wizardData.discountType,
          discount_value: wizardData.discountValue,
          usage_limit_total: wizardData.usageLimitTotal,
          usage_limit_per_user: wizardData.usageLimitPerUser,
          end_date: wizardData.endDate ? wizardData.endDate.toISOString().split('T')[0] : null,
          min_booking_amount: wizardData.minBookingAmount
        })
        .eq('id', promoId);

      if (updateError) throw updateError;

      // Delete existing field links and recreate
      await supabase.from('promo_fields').delete().eq('promo_code_id', promoId);
      
      if (!wizardData.allFields && wizardData.selectedFieldIds.length > 0) {
        const fieldLinks = wizardData.selectedFieldIds.map(fieldId => ({
          promo_code_id: promoId,
          field_id: fieldId
        }));
        await supabase.from('promo_fields').insert(fieldLinks);
      }

      // Delete existing slot links and recreate
      await supabase.from('promo_time_slots').delete().eq('promo_code_id', promoId);
      
      if (!wizardData.allSlots && wizardData.selectedSlots.length > 0) {
        const slotLinks = wizardData.selectedSlots.map(slot => ({
          promo_code_id: promoId,
          day_of_week: slot.dayOfWeek,
          start_time: slot.startTime,
          end_time: slot.endTime
        }));
        await supabase.from('promo_time_slots').insert(slotLinks);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promo-codes'] });
      queryClient.invalidateQueries({ queryKey: ['promo-stats'] });
      toast({
        title: "Promotion mise à jour",
        description: "Les modifications ont été enregistrées."
      });
      closeWizard();
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de mettre à jour la promotion",
        variant: "destructive"
      });
    }
  });

  const deletePromoMutation = useMutation({
    mutationFn: async (promoId: string) => {
      const { error } = await supabase
        .from('promo_codes')
        .update({ status: 'deleted' })
        .eq('id', promoId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promo-codes'] });
      queryClient.invalidateQueries({ queryKey: ['promo-stats'] });
      toast({
        title: "Promotion supprimée",
        description: "La promotion a été supprimée."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de supprimer la promotion",
        variant: "destructive"
      });
    }
  });

  const togglePromoStatus = useMutation({
    mutationFn: async ({ promoId, newStatus }: { promoId: string; newStatus: 'active' | 'paused' }) => {
      const { error } = await supabase
        .from('promo_codes')
        .update({ status: newStatus })
        .eq('id', promoId);

      if (error) throw error;
    },
    onSuccess: (_, { newStatus }) => {
      queryClient.invalidateQueries({ queryKey: ['promo-codes'] });
      queryClient.invalidateQueries({ queryKey: ['promo-stats'] });
      toast({
        title: newStatus === 'active' ? "Promotion activée" : "Promotion mise en pause",
        description: newStatus === 'active' 
          ? "La promotion est maintenant active."
          : "La promotion a été mise en pause."
      });
    }
  });

  return {
    // Wizard state
    step,
    wizardData,
    isOpen,
    
    // Wizard actions
    setStep,
    updateWizardData,
    nextStep,
    prevStep,
    resetWizard,
    openWizard,
    closeWizard,
    generateCode,
    
    // Mutations
    createPromo: createPromoMutation.mutate,
    updatePromo: updatePromoMutation.mutate,
    deletePromo: deletePromoMutation.mutate,
    toggleStatus: togglePromoStatus.mutate,
    
    // Loading states
    isCreating: createPromoMutation.isPending,
    isUpdating: updatePromoMutation.isPending,
    isDeleting: deletePromoMutation.isPending
  };
};
