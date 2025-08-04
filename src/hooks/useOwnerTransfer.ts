import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface TransferToOwnerData {
  booking_id: string;
}

interface TransferToOwnerResponse {
  success: boolean;
  message: string;
  transfer_id?: string;
  amount?: number;
  transfer_response?: any;
}

export const useOwnerTransfer = () => {
  return useMutation({
    mutationFn: async (data: TransferToOwnerData): Promise<TransferToOwnerResponse> => {
      console.log('🔄 Déclenchement payout propriétaire:', data);

      const { data: response, error } = await supabase.functions.invoke('create-owner-payout', {
        body: data
      });

      if (error) {
        console.error('❌ Erreur Edge Function payout:', error);
        throw new Error(error.message || 'Erreur lors du payout');
      }

      console.log('✅ Réponse payout:', response);
      return response;
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success(`Payout effectué avec succès - ${data.amount} XOF`);
      } else {
        toast.error(`Échec payout: ${data.message}`);
      }
    },
    onError: (error: Error) => {
      console.error('❌ Erreur payout propriétaire:', error);
      toast.error(`Erreur: ${error.message}`);
    }
  });
};

// Fonction utilitaire pour déclencher automatiquement le payout (nouvelle version optimisée)
export const triggerOwnerTransferOnConfirmation = async (bookingId: string) => {
  try {
    console.log('🔄 Déclenchement automatique payout pour booking:', bookingId);
    
    const { data, error } = await supabase.functions.invoke('create-owner-payout', {
      body: { booking_id: bookingId }
    });

    if (error) {
      console.error('❌ Erreur payout automatique:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ Payout automatique réussi:', data);
    return { success: true, data };
  } catch (error) {
    console.error('❌ Erreur lors du payout automatique:', error);
    return { success: false, error: error.message };
  }
};