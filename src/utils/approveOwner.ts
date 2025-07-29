import { supabase } from '@/integrations/supabase/client';

export const approveOwnerWithCinetPay = async (ownerId: string, adminNotes?: string) => {
  const { data, error } = await supabase.functions.invoke('admin-approve-owner', {
    body: { 
      owner_id: ownerId,
      admin_notes: adminNotes 
    }
  });

  if (error) {
    throw new Error(error.message || 'Erreur lors de l\'approbation');
  }

  return data;
};