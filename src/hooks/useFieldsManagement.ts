
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
        console.log('🔍 [DEBUG] Fetching fields with admin permissions:', hasAdminPermissions);
        
        const { data, error } = await supabase
          .from('fields')
          .select(`
            *,
            profiles!fields_owner_id_fkey(full_name, email)
          `)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('❌ Error fetching fields:', error);
          return [];
        }
        
        console.log('✅ [DEBUG] Fields fetched:', data?.length || 0, 'fields');
        console.log('📊 [DEBUG] Active/Inactive breakdown:', {
          total: data?.length || 0,
          active: data?.filter(f => f.is_active).length || 0,
          inactive: data?.filter(f => !f.is_active).length || 0
        });
        
        return data || [];
      } catch (error) {
        console.error('❌ Error fetching fields:', error);
        return [];
      }
    },
    enabled: hasAdminPermissions,
    staleTime: 0,
    gcTime: 0
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
      const { error } = await supabase.rpc('deactivate_field', {
        field_id: fieldId,
        reason: reason
      });
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
