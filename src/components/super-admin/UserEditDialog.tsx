
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { Database } from '@/integrations/supabase/types';

type UserRoleType = Database['public']['Enums']['user_role_type'];

interface UserWithRoles {
  user_id: string;
  email: string;
  full_name: string;
  roles: string[];
  created_at: string;
}

interface UserEditDialogProps {
  user: UserWithRoles | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  newRole: UserRoleType | '';
  setNewRole: (role: UserRoleType | '') => void;
  reason: string;
  setReason: (reason: string) => void;
  onSave: () => void;
  onCancel: () => void;
  isLoading: boolean;
}

const roleTypes: { value: UserRoleType; label: string }[] = [
  { value: 'super_admin', label: 'Super Admin' },
  { value: 'admin_general', label: 'Admin Général' },
  { value: 'admin_fields', label: 'Admin Terrains' },
  { value: 'admin_users', label: 'Admin Utilisateurs' },
  { value: 'moderator', label: 'Modérateur' },
  { value: 'owner', label: 'Propriétaire' },
  { value: 'player', label: 'Joueur' }
];

export const UserEditDialog: React.FC<UserEditDialogProps> = ({
  user,
  open,
  onOpenChange,
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
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Modifier l'utilisateur</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Utilisateur</Label>
            <p className="text-sm text-gray-600">{user.full_name} ({user.email})</p>
            <p className="text-xs text-gray-500">Rôles actuels: {user.roles.join(', ') || 'Aucun'}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Nouveau rôle</Label>
            <Select value={newRole || undefined} onValueChange={(value) => setNewRole(value as UserRoleType)}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un rôle" />
              </SelectTrigger>
              <SelectContent>
                {roleTypes.map((role) => (
                  <SelectItem key={role.value} value={role.value}>
                    {role.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Raison du changement *</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Expliquez pourquoi vous effectuez ce changement..."
              required
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={isLoading}>
            Annuler
          </Button>
          <Button 
            onClick={onSave} 
            disabled={isLoading || !newRole || !reason.trim()}
          >
            {isLoading ? 'Modification...' : 'Modifier'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
