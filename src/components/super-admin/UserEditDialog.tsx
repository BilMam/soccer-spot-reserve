
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { Database } from '@/integrations/supabase/types';

type UserRoleType = Database['public']['Enums']['user_role_type'];

interface UserWithRoles {
  user_id: string;
  email: string;
  full_name: string;
  user_type: string;
  roles: string[];
  created_at: string;
}

interface UserEditDialogProps {
  user: UserWithRoles | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  newUserType: string;
  setNewUserType: (type: string) => void;
  newRole: UserRoleType | '';
  setNewRole: (role: UserRoleType | '') => void;
  reason: string;
  setReason: (reason: string) => void;
  onSave: () => void;
  onCancel: () => void;
  isLoading: boolean;
}

export const UserEditDialog: React.FC<UserEditDialogProps> = ({
  user,
  open,
  onOpenChange,
  newUserType,
  setNewUserType,
  newRole,
  setNewRole,
  reason,
  setReason,
  onSave,
  onCancel,
  isLoading
}) => {
  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Modifier l'utilisateur: {user.full_name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Nouveau type d'utilisateur
            </label>
            <Select value={newUserType} onValueChange={setNewUserType}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="player">Joueur</SelectItem>
                <SelectItem value="owner">Propriétaire</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="super_admin">Super Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Nouveau rôle (optionnel)
            </label>
            <Select value={newRole} onValueChange={(value) => setNewRole(value as UserRoleType | '')}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un rôle" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Aucun rôle</SelectItem>
                <SelectItem value="player">Joueur</SelectItem>
                <SelectItem value="owner">Propriétaire</SelectItem>
                <SelectItem value="moderator">Modérateur</SelectItem>
                <SelectItem value="admin_users">Admin Utilisateurs</SelectItem>
                <SelectItem value="admin_fields">Admin Terrains</SelectItem>
                <SelectItem value="admin_general">Admin Général</SelectItem>
                <SelectItem value="super_admin">Super Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Raison du changement
            </label>
            <Textarea
              placeholder="Expliquer la raison du changement..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          <div className="flex space-x-2">
            <Button 
              onClick={onSave}
              disabled={!newUserType || !reason || isLoading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Appliquer les changements
            </Button>
            <Button 
              variant="outline" 
              onClick={onCancel}
            >
              Annuler
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
