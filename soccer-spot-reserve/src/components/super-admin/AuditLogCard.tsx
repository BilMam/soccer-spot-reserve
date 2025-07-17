
import React from 'react';
import { Badge } from '@/components/ui/badge';

interface AuditLog {
  id: string;
  action_type: string;
  target_user_id: string;
  performed_by: string;
  old_value: string;
  new_value: string;
  reason: string;
  created_at: string;
}

interface AuditLogCardProps {
  log: AuditLog;
}

export const AuditLogCard: React.FC<AuditLogCardProps> = ({ log }) => {
  return (
    <div className="border rounded-lg p-4">
      <div className="flex justify-between items-start mb-2">
        <div>
          <Badge variant="outline" className="mb-1">
            {log.action_type}
          </Badge>
          <p className="text-sm text-gray-600">
            {new Date(log.created_at).toLocaleString('fr-FR')}
          </p>
        </div>
      </div>
      <div className="text-sm space-y-1">
        {log.old_value && (
          <p><strong>Ancienne valeur:</strong> {log.old_value}</p>
        )}
        {log.new_value && (
          <p><strong>Nouvelle valeur:</strong> {log.new_value}</p>
        )}
        {log.reason && (
          <p><strong>Raison:</strong> {log.reason}</p>
        )}
      </div>
    </div>
  );
};
