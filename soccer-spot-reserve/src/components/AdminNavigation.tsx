
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Crown, Shield, Settings } from 'lucide-react';

const AdminNavigation = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

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

  const isSuperAdmin = userRoles?.some(role => role.role === 'super_admin');
  const hasAdminPermissions = userRoles?.some(role => 
    ['super_admin', 'admin_general', 'admin_fields', 'admin_users'].includes(role.role)
  );

  if (!hasAdminPermissions) return null;

  return (
    <div className="flex space-x-2">
      {hasAdminPermissions && (
        <Button
          variant="outline"
          onClick={() => navigate('/admin-dashboard')}
          className="flex items-center space-x-2"
        >
          <Shield className="w-4 h-4" />
          <span>Admin</span>
        </Button>
      )}
      
      {isSuperAdmin && (
        <Button
          variant="outline"
          onClick={() => navigate('/super-admin-dashboard')}
          className="flex items-center space-x-2 border-red-200 text-red-700 hover:bg-red-50"
        >
          <Crown className="w-4 h-4" />
          <span>Super Admin</span>
        </Button>
      )}
    </div>
  );
};

export default AdminNavigation;
