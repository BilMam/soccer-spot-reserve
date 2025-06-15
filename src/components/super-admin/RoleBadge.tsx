
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { getRoleBadgeColor, getRoleLabel } from '@/utils/roleUtils';

interface RoleBadgeProps {
  role: string;
  variant?: 'default' | 'outline';
}

export const RoleBadge: React.FC<RoleBadgeProps> = ({ role, variant = 'default' }) => {
  if (variant === 'outline') {
    return (
      <Badge variant="outline">
        {getRoleLabel(role)}
      </Badge>
    );
  }

  return (
    <Badge className={getRoleBadgeColor(role)}>
      {getRoleLabel(role)}
    </Badge>
  );
};
