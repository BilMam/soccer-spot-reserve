
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { OwnerApplication } from '@/types/admin';

export const useOwnerApplications = (hasAdminPermissions: boolean) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: applications, isLoading: loadingApplications } = useQuery({
    queryKey: ['owner-applications-admin'],
    queryFn: async (): Promise<OwnerApplication[]> => {
      try {
        const { data, error } = await supabase.rpc('get_all_owner_applications');
        if (error) {
          console.error('Error fetching applications:', error);
          return [];
        }
        return data || [];
      } catch (error) {
        console.error('Error in RPC call:', error);
        return [];
      }
    },
    enabled: hasAdminPermissions
  });

  const approveApplicationMutation = useMutation({
    mutationFn: async (applicationId: string) => {
      const { error } = await supabase.rpc('approve_owner_application', {
        application_id: applicationId
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Demande approuvée",
        description: "L'utilisateur est maintenant propriétaire.",
      });
      queryClient.invalidateQueries({ queryKey: ['owner-applications-admin'] });
    },
    onError: (error: any) => {
      console.error('Error approving application:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'approuver la demande.",
        variant: "destructive"
      });
    }
  });

  const rejectApplicationMutation = useMutation({
    mutationFn: async ({ applicationId, notes }: { applicationId: string, notes: string }) => {
      const { error } = await supabase.rpc('reject_owner_application', {
        application_id: applicationId,
        notes: notes
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Demande rejetée",
        description: "L'utilisateur a été notifié du rejet.",
      });
      queryClient.invalidateQueries({ queryKey: ['owner-applications-admin'] });
    },
    onError: (error: any) => {
      console.error('Error rejecting application:', error);
      toast({
        title: "Erreur",
        description: "Impossible de rejeter la demande.",
        variant: "destructive"
      });
    }
  });

  return {
    applications,
    loadingApplications,
    approveApplicationMutation,
    rejectApplicationMutation
  };
};
