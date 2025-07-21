
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { createOwnerContactOnApproval } from '@/hooks/useOwnerContactCreation';
import type { OwnerApplication } from '@/types/admin';

export const useOwnerApplications = (hasAdminPermissions: boolean) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: applications, isLoading: loadingApplications } = useQuery({
    queryKey: ['owner-applications-admin'],
    queryFn: async (): Promise<OwnerApplication[]> => {
      try {
        // Récupérer les demandes d'abord
        const { data: applicationsData, error: applicationsError } = await supabase
          .from('owner_applications')
          .select('*, phone_payout')
          .order('created_at', { ascending: false });
          
        if (applicationsError) {
          console.error('Error fetching applications:', applicationsError);
          return [];
        }

        if (!applicationsData || applicationsData.length === 0) {
          return [];
        }

        // Récupérer les profils séparément
        const userIds = applicationsData.map(app => app.user_id);
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, email')
          .in('id', userIds);

        if (profilesError) {
          console.error('Error fetching profiles:', profilesError);
          return applicationsData.map(app => ({ ...app, user_email: undefined }));
        }

        // Joindre les données
        const transformedData = applicationsData.map(app => {
          const profile = profilesData?.find(p => p.id === app.user_id);
          return {
            ...app,
            user_email: profile?.email
          };
        });
        
        return transformedData;
      } catch (error) {
        console.error('Error in fetching applications:', error);
        return [];
      }
    },
    enabled: hasAdminPermissions
  });

  const approveApplicationMutation = useMutation({
    mutationFn: async (applicationId: string) => {
      console.log('Attempting to approve application:', applicationId);
      
      // Récupérer les détails de l'application avant approbation
      const { data: applicationData, error: fetchError } = await supabase
        .from('owner_applications')
        .select('*')
        .eq('id', applicationId)
        .single();

      if (fetchError || !applicationData) {
        throw new Error('Impossible de récupérer les détails de l\'application');
      }

      // Récupérer le profil utilisateur
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('full_name, email, phone')
        .eq('id', applicationData.user_id)
        .single();

      // Approuver l'application
      const { data, error } = await supabase.rpc('approve_owner_application', {
        application_id: applicationId
      });
      console.log('RPC response:', { data, error });
      if (error) {
        console.error('RPC Error details:', error);
        throw error;
      }

      // Créer automatiquement le contact CinetPay après approbation
      if (userProfile) {
        await createOwnerContactOnApproval(
          applicationData.user_id,
          userProfile
        );
      }

      return data;
    },
    onSuccess: () => {
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
      const { data, error } = await supabase.rpc('reject_owner_application', {
        application_id: applicationId,
        notes: notes
      });
      console.log('RPC response:', { data, error });
      if (error) {
        console.error('RPC Error details:', error);
        throw error;
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
