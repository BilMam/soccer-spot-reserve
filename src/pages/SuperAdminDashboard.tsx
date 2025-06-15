import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import Navbar from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Crown, Users, Shield, Eye, History, UserCog } from 'lucide-react';
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

const SuperAdminDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedUser, setSelectedUser] = useState<UserWithRoles | null>(null);
  const [newUserType, setNewUserType] = useState('');
  const [newRole, setNewRole] = useState<UserRoleType | ''>('');
  const [reason, setReason] = useState('');

  // Vérifier si l'utilisateur est super admin
  const { data: userRoles } = useQuery({
    queryKey: ['user-roles', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('is_active', true);
      if (error) throw error;
      return data;
    },
    enabled: !!user
  });

  const isSuperAdmin = userRoles?.some(role => role.role === 'super_admin');

  // Récupérer tous les utilisateurs avec leurs rôles
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

  // Récupérer les logs d'audit
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

  // Mutation pour changer le type d'utilisateur
  const changeUserTypeMutation = useMutation({
    mutationFn: async ({ userId, userType, role, reason }: { 
      userId: string, 
      userType: string, 
      role?: UserRoleType, 
      reason: string 
    }) => {
      const { error } = await supabase.rpc('change_user_type', {
        target_user_id: userId,
        new_user_type: userType,
        new_role: role || null,
        reason: reason
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Type d'utilisateur modifié",
        description: "Le changement a été effectué avec succès.",
      });
      queryClient.invalidateQueries({ queryKey: ['users-with-roles'] });
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
      setSelectedUser(null);
      setNewUserType('');
      setNewRole('');
      setReason('');
    },
    onError: (error: any) => {
      console.error('Error changing user type:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de modifier le type d'utilisateur.",
        variant: "destructive"
      });
    }
  });

  // Mutation pour accorder un rôle
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

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container mx-auto px-4 py-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Accès non autorisé</h1>
          <p className="text-gray-600">Vous devez être connecté pour accéder à cette page.</p>
        </div>
      </div>
    );
  }

  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container mx-auto px-4 py-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Accès interdit</h1>
          <p className="text-gray-600">Seuls les Super Admins peuvent accéder à cette page.</p>
        </div>
      </div>
    );
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'super_admin': return 'bg-red-100 text-red-800';
      case 'admin_general': return 'bg-purple-100 text-purple-800';
      case 'admin_fields': return 'bg-blue-100 text-blue-800';
      case 'admin_users': return 'bg-green-100 text-green-800';
      case 'moderator': return 'bg-yellow-100 text-yellow-800';
      case 'owner': return 'bg-orange-100 text-orange-800';
      case 'player': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'super_admin': return 'Super Admin';
      case 'admin_general': return 'Admin Général';
      case 'admin_fields': return 'Admin Terrains';
      case 'admin_users': return 'Admin Utilisateurs';
      case 'moderator': return 'Modérateur';
      case 'owner': return 'Propriétaire';
      case 'player': return 'Joueur';
      default: return role;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <Crown className="w-8 h-8 text-red-600" />
            <h1 className="text-3xl font-bold text-gray-900">Super Admin Dashboard</h1>
          </div>
          <p className="text-gray-600">Gestion complète des utilisateurs et des rôles du système</p>
        </div>

        <Tabs defaultValue="users" className="space-y-6">
          <TabsList>
            <TabsTrigger value="users" className="flex items-center space-x-2">
              <Users className="w-4 h-4" />
              <span>Gestion des Utilisateurs</span>
            </TabsTrigger>
            <TabsTrigger value="audit" className="flex items-center space-x-2">
              <History className="w-4 h-4" />
              <span>Logs d'Audit</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users">
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
                      <div key={user.user_id} className="border rounded-lg p-4 space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-semibold text-lg">{user.full_name}</h3>
                            <p className="text-gray-600">{user.email}</p>
                            <p className="text-sm text-gray-500">
                              Membre depuis le {new Date(user.created_at).toLocaleDateString('fr-FR')}
                            </p>
                          </div>
                          <div className="flex flex-col items-end space-y-2">
                            <Badge variant="outline" className="mb-2">
                              Type: {user.user_type}
                            </Badge>
                            <div className="flex flex-wrap gap-1">
                              {user.roles.map((role) => (
                                <Badge 
                                  key={role} 
                                  className={getRoleBadgeColor(role)}
                                >
                                  {getRoleLabel(role)}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="flex space-x-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                variant="outline"
                                onClick={() => setSelectedUser(user)}
                              >
                                <UserCog className="w-4 h-4 mr-2" />
                                Modifier
                              </Button>
                            </DialogTrigger>
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
                                    onClick={() => {
                                      if (selectedUser && newUserType && reason) {
                                        changeUserTypeMutation.mutate({
                                          userId: selectedUser.user_id,
                                          userType: newUserType,
                                          role: newRole || undefined,
                                          reason: reason
                                        });
                                      }
                                    }}
                                    disabled={!newUserType || !reason || changeUserTypeMutation.isPending}
                                    className="bg-blue-600 hover:bg-blue-700"
                                  >
                                    Appliquer les changements
                                  </Button>
                                  <Button 
                                    variant="outline" 
                                    onClick={() => {
                                      setSelectedUser(null);
                                      setNewUserType('');
                                      setNewRole('');
                                      setReason('');
                                    }}
                                  >
                                    Annuler
                                  </Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="audit">
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
                      <div key={log.id} className="border rounded-lg p-4">
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
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default SuperAdminDashboard;
