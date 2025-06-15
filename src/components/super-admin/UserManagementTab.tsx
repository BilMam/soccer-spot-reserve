
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UserCard } from './UserCard';
import { UserEditDialog } from './UserEditDialog';
import { useUserManagement } from '@/hooks/useUserManagement';

interface UserWithRoles {
  user_id: string;
  email: string;
  full_name: string;
  user_type: string;
  roles: string[];
  created_at: string;
}

interface UserManagementTabProps {
  isSuperAdmin: boolean;
}

export const UserManagementTab: React.FC<UserManagementTabProps> = ({ isSuperAdmin }) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const {
    selectedUser,
    setSelectedUser,
    newUserType,
    setNewUserType,
    newRole,
    setNewRole,
    reason,
    setReason,
    changeUserTypeMutation,
    resetForm
  } = useUserManagement();

  const { data: users, isLoading: loadingUsers } = useQuery({
    queryKey: ['users-with-roles'],
    queryFn: async (): Promise<UserWithRoles[]> => {
      const { data, error } = await supabase.rpc('get_users_with_roles');
      if (error) {
        console.error('Error fetching users:', error);
        return [];
      }
      return data || [];
    },
    enabled: isSuperAdmin
  });

  const handleEdit = (user: UserWithRoles) => {
    setSelectedUser(user);
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (selectedUser && newUserType && reason) {
      changeUserTypeMutation.mutate({
        userId: selectedUser.user_id,
        userType: newUserType,
        role: newRole || undefined,
        reason: reason
      });
      setDialogOpen(false);
    }
  };

  const handleCancel = () => {
    resetForm();
    setDialogOpen(false);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Utilisateurs et Rôles</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingUsers ? (
            <div className="text-center py-8">Chargement...</div>
          ) : !users || users.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Aucun utilisateur trouvé
            </div>
          ) : (
            <div className="space-y-4">
              {users.map((user) => (
                <UserCard 
                  key={user.user_id} 
                  user={user} 
                  onEdit={handleEdit}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <UserEditDialog
        user={selectedUser}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        newUserType={newUserType}
        setNewUserType={setNewUserType}
        newRole={newRole}
        setNewRole={setNewRole}
        reason={reason}
        setReason={setReason}
        onSave={handleSave}
        onCancel={handleCancel}
        isLoading={changeUserTypeMutation.isPending}
      />
    </>
  );
};
