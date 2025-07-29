
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
      
<<<<<<< HEAD
      // Approuver l'application via RPC
=======
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

      // Approuver l'application via la fonction RPC
>>>>>>> origin/main
      const { data, error } = await supabase.rpc('approve_owner_application', {
        application_id: applicationId
      });
      
      console.log('RPC response:', { data, error });
      if (error) {
        console.error('RPC Error details:', error);
        throw new Error(error.message || 'Erreur lors de l\'approbation');
      }

      // Check if the approval was successful and if we need to create CinetPay contact
      if (data?.success && data?.should_create_contact && data?.contact_data) {
        try {
          console.log('Creating CinetPay contact with data:', data.contact_data);
          
          // Call the create-owner-contact edge function
          const { data: contactResponse, error: contactError } = await supabase.functions.invoke('create-owner-contact', {
            body: data.contact_data
          });

          if (contactError) {
            console.error('CinetPay contact creation failed:', contactError);
            // Don't throw here - approval was successful, contact creation is secondary
            console.warn('Application approved but CinetPay contact creation failed');
            
            // Update data to reflect contact creation failure
            data.contact_creation_failed = true;
            data.contact_error = contactError.message;
          } else if (contactResponse?.success) {
            console.log('CinetPay contact created successfully:', contactResponse);
            
            // Update data to reflect successful contact creation
            data.contact_created = true;
            data.contact_id = contactResponse.contact_id;
            data.was_already_existing = contactResponse.was_already_existing;
          } else {
            console.warn('CinetPay contact creation returned unsuccessful response:', contactResponse);
            data.contact_creation_failed = true;
            data.contact_error = contactResponse?.error || 'Unknown contact creation error';
          }
        } catch (contactError) {
          console.error('Error creating CinetPay contact:', contactError);
          // Don't throw - approval was successful
          data.contact_creation_failed = true;
          data.contact_error = contactError.message;
        }
      } else if (data?.success) {
        console.log('Application approved without CinetPay contact requirement');
      }

      return data;
    },
    onSuccess: (data) => {
      let description = "L'utilisateur est maintenant propriétaire.";
      
      if (data?.contact_created) {
        description = data.was_already_existing 
          ? "L'utilisateur est maintenant propriétaire. Compte CinetPay existant réutilisé."
          : "L'utilisateur est maintenant propriétaire et son compte CinetPay a été créé.";
      } else if (data?.contact_creation_failed) {
        description = "L'utilisateur est maintenant propriétaire, mais la création du compte CinetPay a échoué. Veuillez réessayer manuellement.";
      } else if (data?.should_create_contact) {
        description = "L'utilisateur est maintenant propriétaire. Configuration CinetPay en cours...";
      }
      
      toast({
        title: "Demande approuvée ✔",
        description: description,
        variant: data?.contact_creation_failed ? "destructive" : "default"
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
      
      if (!data?.success) {
        throw new Error(data?.error || 'Erreur lors du rejet');
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
