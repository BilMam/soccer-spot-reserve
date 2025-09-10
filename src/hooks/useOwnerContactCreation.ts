import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CreateOwnerContactData {
  owner_id: string;
  owner_name: string;
  owner_surname?: string;
  phone: string;
  email: string;
  country_prefix?: string;
}

interface CreateOwnerContactResponse {
  success: boolean;
  message: string;
  already_exists?: boolean;
  payment_status?: string;
  owner_id?: string;
}

export const useOwnerContactCreation = () => {
  return useMutation({
    mutationFn: async (data: CreateOwnerContactData): Promise<CreateOwnerContactResponse> => {
      console.log('🔄 Création contact propriétaire:', data);

      const { data: response, error } = await supabase.functions.invoke('create-owner-contact', {
        body: data
      });

      if (error) {
        console.error('❌ Erreur Edge Function:', error);
        throw new Error(error.message || 'Erreur lors de la création du contact');
      }

      console.log('✅ Réponse création contact:', response);
      return response;
    },
    onSuccess: (data) => {
      if (data.success) {
        if (data.already_exists) {
          toast.success('Contact propriétaire déjà configuré');
        } else {
          toast.success('Contact propriétaire créé avec succès');
        }
      }
    },
    onError: (error: Error) => {
      console.error('❌ Erreur création contact:', error);
      toast.error(`Erreur: ${error.message}`);
    }
  });
};

// Fonction utilitaire pour créer automatiquement un contact lors de l'approbation
export const createOwnerContactOnApproval = async (
  ownerId: string,
  ownerProfile: {
    full_name?: string;
    email?: string;
    phone?: string;
  }
) => {
  if (!ownerProfile.full_name || !ownerProfile.email || !ownerProfile.phone) {
    console.warn('⚠️ Informations propriétaire incomplètes pour création contact paiement');
    return;
  }

  try {
    // Séparer le nom en prénom et nom de famille
    const nameParts = ownerProfile.full_name.split(' ');
    const owner_name = nameParts[0] || 'Propriétaire';
    const owner_surname = nameParts.slice(1).join(' ') || 'MySport';

    // Nettoyer le numéro de téléphone (retirer le +225 si présent)
    const cleanPhone = ownerProfile.phone.replace(/^\+?225/, '');

    const { data, error } = await supabase.functions.invoke('create-owner-contact', {
      body: {
        owner_id: ownerId,
        owner_name,
        owner_surname,
        phone: cleanPhone,
        email: ownerProfile.email,
        country_prefix: '225'
      }
    });

    if (error) {
      console.error('❌ Erreur création automatique contact:', error);
    } else {
      console.log('✅ Contact créé automatiquement:', data);
    }
  } catch (error) {
    console.error('❌ Erreur lors de la création automatique du contact:', error);
  }
};