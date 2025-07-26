import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Phone, Calendar, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { approveOwnerWithCinetPay } from '@/utils/approveOwner';

interface PendingOwner {
  id: string;
  user_id: string;
  phone: string;
  status: string;
  created_at: string;
  // Profile data
  full_name?: string;
  email?: string;
}

interface OwnersPendingTabProps {
  hasAdminPermissions: boolean;
}

export const OwnersPendingTab: React.FC<OwnersPendingTabProps> = ({ hasAdminPermissions }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: pendingOwners, isLoading } = useQuery({
    queryKey: ['owners-pending'],
    queryFn: async (): Promise<PendingOwner[]> => {
      try {
        // Récupérer les propriétaires avec status pending
        const { data: ownersData, error: ownersError } = await supabase
          .from('owners')
          .select('id, user_id, phone, status, created_at')
          .eq('status', 'pending')
          .order('created_at', { ascending: false });
          
        if (ownersError) {
          console.error('Error fetching pending owners:', ownersError);
          return [];
        }

        if (!ownersData || ownersData.length === 0) {
          return [];
        }

        // Récupérer les profils utilisateurs
        const userIds = ownersData.map(owner => owner.user_id);
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', userIds);

        // Récupérer les applications correspondantes (si elles existent encore)
        const { data: applicationsData } = await supabase
          .from('owner_applications')
          .select('user_id, phone, full_name')
          .in('user_id', userIds);

        if (profilesError) {
          console.error('Error fetching profiles:', profilesError);
        }

        // Joindre les données et utiliser le téléphone de l'application si le owner n'en a pas
        const enrichedData = ownersData.map(owner => {
          const profile = profilesData?.find(p => p.id === owner.user_id);
          const application = applicationsData?.find(a => a.user_id === owner.user_id);
          
          return {
            ...owner,
            phone: owner.phone || application?.phone || 'Non renseigné',
            full_name: profile?.full_name || application?.full_name || 'Nom non disponible',
            email: profile?.email
          };
        });
        
        return enrichedData;
      } catch (error) {
        console.error('Error in fetching pending owners:', error);
        return [];
      }
    },
    enabled: hasAdminPermissions
  });

  const approveOwnerMutation = useMutation({
    mutationFn: async (ownerId: string) => {
      console.log('Attempting to approve owner via admin-approve-owner:', ownerId);
      
      // Vérifier que le propriétaire a un numéro de téléphone
      const owner = pendingOwners?.find(o => o.id === ownerId);
      if (!owner?.phone || owner.phone === 'Non renseigné') {
        throw new Error('Le propriétaire doit avoir un numéro de téléphone pour créer un contact CinetPay');
      }
      
      const { data, error } = await supabase.functions.invoke('admin-approve-owner', {
        body: { owner_id: ownerId }
      });
      
      console.log('Edge function full response:', { data, error });
      
      if (error) {
        console.error('Edge function error details:', error);
        
        // Try to get more details about the error
        if (error.message?.includes('non-2xx status code')) {
          throw new Error('Erreur d\'authentification ou de permission. Vérifiez que vous êtes bien admin.');
        }
        throw error;
      }
      
      if (!data?.success) {
        throw new Error(data?.message || 'Erreur lors de l\'approbation');
      }

      return data;
    },
    onSuccess: (data) => {
      toast({
        title: "Propriétaire approuvé",
        description: `Contact CinetPay créé avec succès (ID: ${data.cinetpay_contact_id})`,
      });
      queryClient.invalidateQueries({ queryKey: ['owners-pending'] });
    },
    onError: (error: any) => {
      console.error('Error approving owner:', error);
      toast({
        title: "Erreur",
        description: `Impossible d'approuver le propriétaire: ${error.message || 'Erreur inconnue'}`,
        variant: "destructive"
      });
    }
  });

  const fixPhoneMutation = useMutation({
    mutationFn: async (ownerId: string) => {
      console.log('Attempting to fix phone number for owner:', ownerId);
      
      const owner = pendingOwners?.find(o => o.id === ownerId);
      if (!owner?.user_id) {
        throw new Error('Owner not found');
      }

      // Récupérer le numéro depuis l'application
      const { data: application, error: appError } = await supabase
        .from('owner_applications')
        .select('phone')
        .eq('user_id', owner.user_id)
        .single();

      if (appError || !application?.phone) {
        throw new Error('Aucun numéro de téléphone trouvé dans l\'application');
      }

      // Mettre à jour le propriétaire avec le numéro
      const { error: updateError } = await supabase
        .from('owners')
        .update({
          phone: application.phone,
          mobile_money: application.phone
        })
        .eq('id', ownerId);

      if (updateError) {
        throw new Error(`Erreur lors de la mise à jour: ${updateError.message}`);
      }

      return application.phone;
    },
    onSuccess: (phoneNumber) => {
      toast({
        title: "Numéro récupéré",
        description: `Numéro de téléphone mis à jour: ${phoneNumber}`,
      });
      queryClient.invalidateQueries({ queryKey: ['owners-pending'] });
    },
    onError: (error: any) => {
      console.error('Error fixing phone:', error);
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleApprove = (ownerId: string) => {
    approveOwnerMutation.mutate(ownerId);
  };

  const handleFixPhone = (ownerId: string) => {
    fixPhoneMutation.mutate(ownerId);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-orange-500" />
          Propriétaires en attente de finalisation
        </CardTitle>
        <p className="text-sm text-gray-600">
          Ces propriétaires ont été approuvés mais n'ont pas encore de contact CinetPay.
        </p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8">Chargement...</div>
        ) : !pendingOwners || pendingOwners.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            Aucun propriétaire en attente de finalisation
          </div>
        ) : (
          <div className="space-y-4">
            {pendingOwners.map((owner) => (
              <div key={owner.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-lg">
                      {owner.full_name || 'Nom non disponible'}
                    </h3>
                    <p className="text-gray-600">{owner.email}</p>
                    <p className="text-sm text-gray-500 flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      Créé le {new Date(owner.created_at).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                  <div className="bg-orange-100 text-orange-800 px-2 py-1 rounded text-sm">
                    En attente
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    <strong>Téléphone :</strong> {owner.phone || 'Non renseigné'}
                  </div>
                  <div>
                    <strong>ID Owner :</strong> <code className="text-xs">{owner.id}</code>
                  </div>
                </div>

                <div className="flex space-x-2">
                  {owner.phone === 'Non renseigné' ? (
                    <Button 
                      onClick={() => handleFixPhone(owner.id)}
                      disabled={fixPhoneMutation.isPending}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Phone className="w-4 h-4 mr-2" />
                      {fixPhoneMutation.isPending ? 'Récupération...' : 'Récupérer le numéro'}
                    </Button>
                  ) : (
                    <Button 
                      onClick={() => handleApprove(owner.id)}
                      disabled={approveOwnerMutation.isPending}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      {approveOwnerMutation.isPending ? 'Création CinetPay...' : 'Créer Contact CinetPay'}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};