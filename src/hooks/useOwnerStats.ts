
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export const useOwnerStats = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['owner-stats', user?.id],
    queryFn: async () => {
      if (!user) throw new Error('Utilisateur non connecté');

      const { data, error } = await supabase
        .from('owner_stats')
        .select('*')
        .eq('owner_id', user.id);

      if (error) throw error;
      return data;
    },
    enabled: !!user
  });
};
