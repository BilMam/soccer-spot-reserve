
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
        // Récupérer les demandes depuis la table owner_applications avec status pending
        const { data: applicationsData, error: applicationsError } = await supabase
          .from('owner_applications')
          .select('*')
          .eq('status', 'pending')
          .order('created_at', { ascending: false });
          
        if (applicationsError) {
          console.error('Error fetching pending applications:', applicationsError);
          return [];
        }

        if (!applicationsData || applicationsData.length === 0) {
          return [];
        }

        // Récupérer les profils séparément
        const userIds = applicationsData.map(app => app.user_id);
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, email, full_name')
          .in('id', userIds);

        if (profilesError) {
          console.error('Error fetching profiles:', profilesError);
          return applicationsData.map(app => ({ 
            id: app.id,
            user_id: app.user_id,
            full_name: app.full_name || 'N/A',
            phone: app.phone,
            phone_payout: app.phone_payout,
            status: app.status,
            created_at: app.created_at,
            updated_at: app.updated_at || app.created_at,
            user_email: undefined,
            admin_notes: app.admin_notes,
            experience: app.experience,
            motivation: app.motivation
          }));
        }

        // Transformer les données pour correspondre à l'interface OwnerApplication
        const transformedData = applicationsData.map(app => {
          const profile = profilesData?.find(p => p.id === app.user_id);
          return {
            id: app.id,
            user_id: app.user_id,
            full_name: app.full_name || profile?.full_name || 'N/A',
            phone: app.phone,
            phone_payout: app.phone_payout,
            status: app.status,
            created_at: app.created_at,
            updated_at: app.updated_at || app.created_at,
            user_email: profile?.email,
            admin_notes: app.admin_notes,
            reviewed_by: app.reviewed_by,
            reviewed_at: app.reviewed_at,
            experience: app.experience,
            motivation: app.motivation
          };
        });
        
        return transformedData;
      } catch (error) {
        console.error('Error in fetching pending applications:', error);
        return [];
      }
    },
    enabled: hasAdminPermissions
  });

  const approveApplicationMutation = useMutation({
    mutationFn: async (applicationId: string) => {
      console.log('Attempting to approve application:', applicationId);
      
      // Utiliser l'edge function approve-owner-request qui gère tout le flux
      const { data, error } = await supabase.functions.invoke('approve-owner-request', {
        body: { 
          application_id: applicationId
        }
      });

      if (error) {
        console.error('Edge Function Error:', error);
        throw error;
      }

      return data;
    },
    onSuccess: (data) => {
      toast({
        title: "Demande approuvée",
        description: "L'utilisateur est maintenant propriétaire et son compte CinetPay a été configuré.",
      });
      queryClient.invalidateQueries({ queryKey: ['owner-applications-admin'] });
    },
    onError: (error: any) => {
      console.error('Error approving application:', error);
      toast({
        title: "Erreur",
        description: `Impossible d'approuver la demande: ${error.message || 'Erreur inconnue'}`,
        variant: "destructive"
      });
    }
  });

  const rejectApplicationMutation = useMutation({
    mutationFn: async ({ applicationId, notes }: { applicationId: string, notes: string }) => {
      console.log('Attempting to reject application:', applicationId, 'with notes:', notes);
      
      // Rejeter l'application via RPC
      const { data, error } = await supabase.rpc('reject_owner_application', {
        application_id: applicationId,
        notes: notes
      });
        
      console.log('RPC response:', { data, error });
      if (error) {
        console.error('RPC Error details:', error);
        throw new Error(error.message || 'Erreur lors du rejet');
      }
      
      const rejectionData = data as any;
      if (!rejectionData?.success) {
        throw new Error(rejectionData?.error || 'Erreur lors du rejet');
      }
      
      return data;
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
        description: `Impossible de rejeter la demande: ${error.message || 'Erreur inconnue'}`,
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
