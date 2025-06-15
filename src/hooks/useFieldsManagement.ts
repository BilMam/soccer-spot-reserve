
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Field } from '@/types/admin';

export const useFieldsManagement = (hasAdminPermissions: boolean) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: fields, isLoading: loadingFields } = useQuery({
    queryKey: ['fields-admin'],
    queryFn: async (): Promise<Field[]> => {
      try {
        const { data, error } = await supabase
          .from('fields')
          .select(`
            *,
            profiles!fields_owner_id_fkey(full_name, email)
          `)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching fields:', error);
          return [];
        }
        return data || [];
      } catch (error) {
        console.error('Error fetching fields:', error);
        return [];
      }
    },
    enabled: hasAdminPermissions
  });

  const approveFieldMutation = useMutation({
    mutationFn: async ({ fieldId }: { fieldId: string }) => {
      const { error } = await supabase.rpc('approve_field', {
        field_id: fieldId
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Terrain approuvé",
        description: "Le terrain est maintenant visible publiquement.",
      });
      queryClient.invalidateQueries({ queryKey: ['fields-admin'] });
    },
    onError: (error: any) => {
      console.error('Error approving field:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'approuver le terrain.",
        variant: "destructive"
      });
    }
  });

  const rejectFieldMutation = useMutation({
    mutationFn: async ({ fieldId, reason }: { fieldId: string; reason: string }) => {
      // Update field to mark as rejected with reason
      const { error } = await supabase
        .from('fields')
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', fieldId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Terrain rejeté",
        description: "Le terrain a été désactivé.",
      });
      queryClient.invalidateQueries({ queryKey: ['fields-admin'] });
    },
    onError: (error: any) => {
      console.error('Error rejecting field:', error);
      toast({
        title: "Erreur",
        description: "Impossible de rejeter le terrain.",
        variant: "destructive"
      });
    }
  });

  return {
    fields,
    loadingFields,
    approveFieldMutation,
    rejectFieldMutation
  };
};
