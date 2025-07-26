import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Phone, Calendar, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

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

        if (profilesError) {
          console.error('Error fetching profiles:', profilesError);
          return ownersData.map(owner => ({ ...owner, full_name: undefined, email: undefined }));
        }

        // Joindre les données
        const enrichedData = ownersData.map(owner => {
          const profile = profilesData?.find(p => p.id === owner.user_id);
          return {
            ...owner,
            full_name: profile?.full_name,
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
      
      const { data, error } = await supabase.functions.invoke('admin-approve-owner', {
        body: { owner_id: ownerId }
      });
      
      console.log('Edge function response:', { data, error });
      if (error) {
        console.error('Edge function error:', error);
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

  const handleApprove = (ownerId: string) => {
    approveOwnerMutation.mutate(ownerId);
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
                  <Button 
                    onClick={() => handleApprove(owner.id)}
                    disabled={approveOwnerMutation.isPending}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    {approveOwnerMutation.isPending ? 'Création CinetPay...' : 'Créer Contact CinetPay'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};