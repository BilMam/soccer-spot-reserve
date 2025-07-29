
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
    newRole,
    setNewRole,
    reason,
    setReason,
    grantRoleMutation,
    resetForm
  } = useUserManagement();

  const { data: users, isLoading: loadingUsers } = useQuery({
    queryKey: ['users-with-roles'],
    queryFn: async (): Promise<UserWithRoles[]> => {
      // Appel direct SQL temporaire en attendant de fixer la fonction RPC
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, full_name, created_at');
        
      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        return [];
      }
      
      if (!profiles) return [];
      
      // Pour chaque profil, récupérer ses rôles
      const usersWithRoles: UserWithRoles[] = [];
      for (const profile of profiles) {
        const { data: roles } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', profile.id)
          .eq('is_active', true);
          
        usersWithRoles.push({
          user_id: profile.id,
          email: profile.email || '',
          full_name: profile.full_name || '',
          roles: roles?.map(r => r.role) || [],
          created_at: profile.created_at || ''
        });
      }
      
      return usersWithRoles;
    },
    enabled: isSuperAdmin
  });

  const handleEdit = (user: UserWithRoles) => {
    setSelectedUser(user);
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (selectedUser && newRole && reason) {
      grantRoleMutation.mutate({
        userId: selectedUser.user_id,
        role: newRole,
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
        newRole={newRole}
        setNewRole={setNewRole}
        reason={reason}
        setReason={setReason}
        onSave={handleSave}
        onCancel={handleCancel}
        isLoading={grantRoleMutation.isPending}
      />
    </>
  );
};
