
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export const useOwnerFields = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['owner-fields', user?.id],
    queryFn: async () => {
      if (!user) throw new Error('Utilisateur non connecté');

      const { data, error } = await supabase
        .from('fields')
        .select(`
          id,
          name,
          location,
          price_per_hour,
          is_active,
          rating,
          total_reviews
        `)
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user
  });
};
