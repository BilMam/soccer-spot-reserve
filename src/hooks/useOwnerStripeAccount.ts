
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export const useOwnerStripeAccount = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['owner-stripe-account', user?.id],
    queryFn: async () => {
      if (!user) throw new Error('Utilisateur non connecté');

      const { data, error } = await supabase
        .from('payment_accounts')
        .select('*')
        .eq('owner_id', user.id)
        .eq('payment_provider', 'stripe')
        .maybeSingle();

      if (error) {
        throw error;
      }

      return data;
    },
    enabled: !!user
  });
};
