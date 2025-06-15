
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export const useAdminPermissions = () => {
  const { user } = useAuth();

  const { data: userRoles } = useQuery({
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

  const hasAdminPermissions = userRoles?.some(role => 
    ['super_admin', 'admin_general', 'admin_fields', 'admin_users'].includes(role.role)
  );

  const isSuperAdmin = userRoles?.some(role => role.role === 'super_admin');
  const isGeneralAdmin = userRoles?.some(role => role.role === 'admin_general');
  const isFieldsAdmin = userRoles?.some(role => role.role === 'admin_fields');
  const isUsersAdmin = userRoles?.some(role => role.role === 'admin_users');

  return {
    user,
    userRoles,
    hasAdminPermissions,
    isSuperAdmin,
    isGeneralAdmin,
    isFieldsAdmin,
    isUsersAdmin
  };
};
