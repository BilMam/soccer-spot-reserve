
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export const usePermissions = () => {
  const { user } = useAuth();

  const { data: userRoles, isLoading: loading } = useQuery({
    queryKey: ['user-roles', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('is_active', true);
      if (error) throw error;
      return data;
    },
    enabled: !!user
  });

  const isSuperAdmin = userRoles?.some(role => role.role === 'super_admin');
  const isOwner = userRoles?.some(role => role.role === 'owner');

  return {
    userRoles,
    isSuperAdmin,
    isOwner,
    loading
  };
};
