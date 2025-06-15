
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AuditLogCard } from './AuditLogCard';

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

interface AuditLogsTabProps {
  isSuperAdmin: boolean;
}

export const AuditLogsTab: React.FC<AuditLogsTabProps> = ({ isSuperAdmin }) => {
  const { data: auditLogs, isLoading: loadingAudit } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: async (): Promise<AuditLog[]> => {
      const { data, error } = await supabase
        .from('role_audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) {
        console.error('Error fetching audit logs:', error);
        return [];
      }
      return data || [];
    },
    enabled: isSuperAdmin
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Logs d'Audit</CardTitle>
      </CardHeader>
      <CardContent>
        {loadingAudit ? (
          <div className="text-center py-8">Chargement...</div>
        ) : !auditLogs || auditLogs.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            Aucun log d'audit trouvé
          </div>
        ) : (
          <div className="space-y-4">
            {auditLogs.map((log) => (
              <AuditLogCard key={log.id} log={log} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
