
import React from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Crown, Shield } from 'lucide-react';

const AdminNavigation = () => {
  const navigate = useNavigate();
  const { hasAdminPermissions, isSuperAdmin } = usePermissions();

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
