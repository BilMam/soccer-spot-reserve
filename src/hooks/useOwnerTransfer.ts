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
      console.log('🔄 Déclenchement transfert propriétaire:', data);

      const { data: response, error } = await supabase.functions.invoke('transfer-to-owner', {
        body: data
      });

      if (error) {
        console.error('❌ Erreur Edge Function transfer:', error);
        throw new Error(error.message || 'Erreur lors du transfert');
      }

      console.log('✅ Réponse transfert:', response);
      return response;
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success(`Transfert effectué avec succès - ${data.amount} XOF`);
      } else {
        toast.error(`Échec transfert: ${data.message}`);
      }
    },
    onError: (error: Error) => {
      console.error('❌ Erreur transfert propriétaire:', error);
      toast.error(`Erreur: ${error.message}`);
    }
  });
};

// Fonction utilitaire pour déclencher automatiquement le transfert
export const triggerOwnerTransferOnConfirmation = async (bookingId: string) => {
  try {
    console.log('🔄 Déclenchement automatique transfert pour booking:', bookingId);
    
    const { data, error } = await supabase.functions.invoke('transfer-to-owner', {
      body: { booking_id: bookingId }
    });

    if (error) {
      console.error('❌ Erreur transfert automatique:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ Transfert automatique réussi:', data);
    return { success: true, data };
  } catch (error) {
    console.error('❌ Erreur lors du transfert automatique:', error);
    return { success: false, error: error.message };
  }
};