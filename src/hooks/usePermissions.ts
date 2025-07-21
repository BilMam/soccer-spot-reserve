
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

type UserRole = 'super_admin' | 'admin_general' | 'admin_fields' | 'admin_users' | 'moderator' | 'owner' | 'player';

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

  const roles = userRoles?.map(r => r.role as UserRole) || [];

  // Fonction pour vérifier si l'utilisateur a un rôle spécifique
  const hasRole = (role: UserRole) => roles.includes(role);

  // Fonction pour vérifier si l'utilisateur a au moins un des rôles spécifiés
  const hasAnyRole = (targetRoles: UserRole[]) => targetRoles.some(role => roles.includes(role));

  // Obtenir le rôle principal (le plus élevé dans la hiérarchie)
  const primaryRole = (): UserRole => {
    const hierarchy: UserRole[] = ['super_admin', 'admin_general', 'admin_fields', 'admin_users', 'moderator', 'owner', 'player'];
    return hierarchy.find(role => roles.includes(role)) || 'player';
  };

  // Raccourcis pour les vérifications courantes
  const isSuperAdmin = hasRole('super_admin');
  const isOwner = hasRole('owner');
  const isAdmin = hasAnyRole(['super_admin', 'admin_general', 'admin_fields', 'admin_users']);
  const hasAdminPermissions = hasAnyRole(['super_admin', 'admin_general', 'admin_fields', 'admin_users']);

  return {
    userRoles,
    roles,
    hasRole,
    hasAnyRole,
    primaryRole: primaryRole(),
    isSuperAdmin,
    isOwner,
    isAdmin,
    hasAdminPermissions,
    loading
  };
};
