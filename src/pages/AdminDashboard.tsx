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
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { CheckCircle, XCircle, Eye, Clock, Users, MapPin } from 'lucide-react';

interface OwnerApplication {
  id: string;
  user_id: string;
  full_name: string;
  phone: string;
  experience?: string;
  motivation?: string;
  status: string; // Changed to string to match database return type
  admin_notes?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  created_at: string;
  updated_at: string;
  user_email?: string;
}

interface Field {
  id: string;
  name: string;
  location: string;
  field_type: string;
  capacity: number;
  price_per_hour: number;
  description?: string;
  created_at: string;
  profiles?: {
    full_name: string;
    email: string;
  };
}

const AdminDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedApplication, setSelectedApplication] = useState<OwnerApplication | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');

  // Vérifier si l'utilisateur a les permissions d'admin
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

  const hasAdminPermissions = userRoles?.some(role => 
    ['super_admin', 'admin_general', 'admin_fields', 'admin_users'].includes(role.role)
  );

  // Récupérer les demandes de propriétaires
  const { data: applications, isLoading: loadingApplications } = useQuery({
    queryKey: ['owner-applications-admin'],
    queryFn: async (): Promise<OwnerApplication[]> => {
      const { data, error } = await supabase.rpc('get_all_owner_applications');
      if (error) {
        console.error('Error fetching applications:', error);
        return [];
      }
      return data || [];
    },
    enabled: hasAdminPermissions
  });

  // Récupérer les terrains
  const { data: fields, isLoading: loadingFields } = useQuery({
    queryKey: ['fields-admin'],
    queryFn: async (): Promise<Field[]> => {
      const { data, error } = await supabase
        .from('fields')
        .select(`
          *,
          profiles!fields_owner_id_fkey(full_name, email)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching fields:', error);
        return [];
      }
      return data || [];
    },
    enabled: hasAdminPermissions
  });

  // Mutation pour approuver une demande
  const approveApplicationMutation = useMutation({
    mutationFn: async (applicationId: string) => {
      const { error } = await supabase.rpc('approve_owner_application', {
        application_id: applicationId
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Demande approuvée",
        description: "L'utilisateur est maintenant propriétaire.",
      });
      queryClient.invalidateQueries({ queryKey: ['owner-applications-admin'] });
    },
    onError: (error: any) => {
      console.error('Error approving application:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'approuver la demande.",
        variant: "destructive"
      });
    }
  });

  // Mutation pour rejeter une demande
  const rejectApplicationMutation = useMutation({
    mutationFn: async ({ applicationId, notes }: { applicationId: string, notes: string }) => {
      const { error } = await supabase.rpc('reject_owner_application', {
        application_id: applicationId,
        notes: notes
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Demande rejetée",
        description: "L'utilisateur a été notifié du rejet.",
      });
      queryClient.invalidateQueries({ queryKey: ['owner-applications-admin'] });
      setSelectedApplication(null);
      setReviewNotes('');
    },
    onError: (error: any) => {
      console.error('Error rejecting application:', error);
      toast({
        title: "Erreur",
        description: "Impossible de rejeter la demande.",
        variant: "destructive"
      });
    }
  });

  // Mutation pour approuver un terrain
  const approveFieldMutation = useMutation({
    mutationFn: async ({ fieldId }: { fieldId: string }) => {
      const { error } = await supabase.rpc('approve_field', {
        field_id: fieldId
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Terrain approuvé",
        description: "Le terrain est maintenant visible publiquement.",
      });
      queryClient.invalidateQueries({ queryKey: ['fields-admin'] });
    },
    onError: (error: any) => {
      console.error('Error approving field:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'approuver le terrain.",
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

  if (!hasAdminPermissions) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container mx-auto px-4 py-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Accès interdit</h1>
          <p className="text-gray-600">Vous n'avez pas les permissions pour accéder à cette page.</p>
        </div>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary"><Clock className="w-4 h-4 mr-1" />En attente</Badge>;
      case 'approved':
        return <Badge variant="default"><CheckCircle className="w-4 h-4 mr-1" />Approuvée</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="w-4 h-4 mr-1" />Rejetée</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard Administrateur</h1>
          <p className="text-gray-600 mt-2">Gérez les demandes de propriétaires et la validation des terrains</p>
        </div>

        <Tabs defaultValue="applications" className="space-y-6">
          <TabsList>
            <TabsTrigger value="applications" className="flex items-center space-x-2">
              <Users className="w-4 h-4" />
              <span>Demandes de propriétaires</span>
            </TabsTrigger>
            <TabsTrigger value="fields" className="flex items-center space-x-2">
              <MapPin className="w-4 h-4" />
              <span>Terrains</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="applications">
            <Card>
              <CardHeader>
                <CardTitle>Demandes de propriétaires</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingApplications ? (
                  <div className="text-center py-8">Chargement...</div>
                ) : !applications || applications.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    Aucune demande de propriétaire en attente
                  </div>
                ) : (
                  <div className="space-y-4">
                    {applications.map((application) => (
                      <div key={application.id} className="border rounded-lg p-4 space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-semibold text-lg">{application.full_name}</h3>
                            <p className="text-gray-600">{application.user_email}</p>
                            <p className="text-sm text-gray-500">
                              Demande soumise le {new Date(application.created_at).toLocaleDateString('fr-FR')}
                            </p>
                          </div>
                          {getStatusBadge(application.status)}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <strong>Téléphone :</strong> {application.phone}
                          </div>
                          {application.experience && (
                            <div>
                              <strong>Expérience :</strong> {application.experience}
                            </div>
                          )}
                          {application.motivation && (
                            <div className="col-span-2">
                              <strong>Motivation :</strong> {application.motivation}
                            </div>
                          )}
                        </div>

                        {application.admin_notes && (
                          <div className="bg-gray-50 p-3 rounded">
                            <strong>Notes admin :</strong> {application.admin_notes}
                          </div>
                        )}

                        {application.status === 'pending' && (
                          <div className="flex space-x-2">
                            <Button 
                              onClick={() => approveApplicationMutation.mutate(application.id)}
                              disabled={approveApplicationMutation.isPending}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Approuver
                            </Button>
                            
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button 
                                  variant="destructive"
                                  onClick={() => setSelectedApplication(application)}
                                >
                                  <XCircle className="w-4 h-4 mr-2" />
                                  Rejeter
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Rejeter la demande</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <p>Êtes-vous sûr de vouloir rejeter la demande de {application.full_name} ?</p>
                                  <Textarea
                                    placeholder="Raison du rejet (optionnel)"
                                    value={reviewNotes}
                                    onChange={(e) => setReviewNotes(e.target.value)}
                                  />
                                  <div className="flex space-x-2">
                                    <Button 
                                      variant="destructive"
                                      onClick={() => rejectApplicationMutation.mutate({
                                        applicationId: application.id,
                                        notes: reviewNotes
                                      })}
                                      disabled={rejectApplicationMutation.isPending}
                                    >
                                      Confirmer le rejet
                                    </Button>
                                    <Button variant="outline" onClick={() => setReviewNotes('')}>
                                      Annuler
                                    </Button>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="fields">
            <Card>
              <CardHeader>
                <CardTitle>Terrains</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingFields ? (
                  <div className="text-center py-8">Chargement...</div>
                ) : !fields || fields.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    Aucun terrain trouvé
                  </div>
                ) : (
                  <div className="space-y-4">
                    {fields.map((field) => (
                      <div key={field.id} className="border rounded-lg p-4 space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-semibold text-lg">{field.name}</h3>
                            <p className="text-gray-600">{field.location}</p>
                            <p className="text-sm text-gray-500">
                              Propriétaire: {field.profiles?.full_name} ({field.profiles?.email})
                            </p>
                            <p className="text-sm text-gray-500">
                              Ajouté le {new Date(field.created_at).toLocaleDateString('fr-FR')}
                            </p>
                          </div>
                          <Badge variant="secondary">
                            <Clock className="w-4 h-4 mr-1" />Actif
                          </Badge>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div><strong>Type :</strong> {field.field_type}</div>
                          <div><strong>Capacité :</strong> {field.capacity} personnes</div>
                          <div><strong>Prix :</strong> {field.price_per_hour}€/h</div>
                        </div>

                        {field.description && (
                          <div>
                            <strong>Description :</strong> {field.description}
                          </div>
                        )}

                        <div className="flex space-x-2">
                          <Button 
                            onClick={() => approveFieldMutation.mutate({ fieldId: field.id })}
                            disabled={approveFieldMutation.isPending}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Approuver
                          </Button>
                          
                          <Button variant="outline">
                            <Eye className="w-4 h-4 mr-2" />
                            Voir les détails
                          </Button>
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

export default AdminDashboard;
