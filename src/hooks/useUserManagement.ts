
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

type UserRoleType = Database['public']['Enums']['user_role_type'];

export const useUserManagement = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [newRole, setNewRole] = useState<UserRoleType | ''>('');
  const [reason, setReason] = useState('');


  const grantRoleMutation = useMutation({
    mutationFn: async ({ userId, role, reason }: { 
      userId: string, 
      role: UserRoleType, 
      reason: string 
    }) => {
      const { error } = await supabase.rpc('grant_role_to_user', {
        target_user_id: userId,
        role_to_grant: role,
        reason: reason
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Rôle accordé",
        description: "Le rôle a été accordé avec succès.",
      });
      queryClient.invalidateQueries({ queryKey: ['users-with-roles'] });
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
    },
    onError: (error: any) => {
      console.error('Error granting role:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'accorder le rôle.",
        variant: "destructive"
      });
    }
  });

  const resetForm = () => {
    setSelectedUser(null);
    setNewRole('');
    setReason('');
  };

  return {
    selectedUser,
    setSelectedUser,
    newRole,
    setNewRole,
    reason,
    setReason,
    grantRoleMutation,
    resetForm
  };
};
