
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { UserCog } from 'lucide-react';
import { RoleBadge } from './RoleBadge';

interface UserWithRoles {
  user_id: string;
  email: string;
  full_name: string;
  roles: string[];
  created_at: string;
}

interface UserCardProps {
  user: UserWithRoles;
  onEdit: (user: UserWithRoles) => void;
}

export const UserCard: React.FC<UserCardProps> = ({ user, onEdit }) => {
  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-semibold text-lg">{user.full_name}</h3>
          <p className="text-gray-600">{user.email}</p>
          <p className="text-sm text-gray-500">
            Membre depuis le {new Date(user.created_at).toLocaleDateString('fr-FR')}
          </p>
        </div>
        <div className="flex flex-col items-end space-y-2">
          <div className="flex flex-wrap gap-1">
            {user.roles.map((role) => (
              <RoleBadge key={role} role={role} />
            ))}
            {user.roles.length === 0 && (
              <Badge variant="outline">Aucun rôle</Badge>
            )}
          </div>
        </div>
      </div>

      <div className="flex space-x-2">
        <Button 
          variant="outline"
          onClick={() => onEdit(user)}
        >
          <UserCog className="w-4 h-4 mr-2" />
          Modifier
        </Button>
      </div>
    </div>
  );
};
