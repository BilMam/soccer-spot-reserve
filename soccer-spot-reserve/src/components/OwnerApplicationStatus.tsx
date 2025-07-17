import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useNavigate } from 'react-router-dom';
import { Clock, CheckCircle, AlertCircle, XCircle } from 'lucide-react';

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
}

const OwnerApplicationStatus = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: application, isLoading } = useQuery({
    queryKey: ['owner-application', user?.id],
    queryFn: async (): Promise<OwnerApplication | null> => {
      if (!user) return null;
      
      const { data, error } = await supabase.rpc('get_user_owner_application', {
        p_user_id: user.id
      });

      if (error) {
        console.error('Error fetching user application:', error);
        return null;
      }

      return data && data.length > 0 ? data[0] : null;
    },
    enabled: !!user
  });

  // Vérifier le statut dans le profil et les rôles
  const { data: userStatus } = useQuery({
    queryKey: ['user-status', user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      // Récupérer le profil
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('user_type')
        .eq('id', user.id)
        .single();
      
      if (profileError) throw profileError;
      
      // Récupérer les rôles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('is_active', true);
      
      if (rolesError) throw rolesError;
      
      return {
        user_type: profile.user_type,
        roles: roles.map(r => r.role)
      };
    },
    enabled: !!user
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse">Chargement du statut de votre demande...</div>
        </CardContent>
      </Card>
    );
  }

  // Si l'utilisateur est déjà propriétaire (approuvé) ou a le rôle owner
  const isOwner = userStatus?.user_type === 'owner' || userStatus?.roles?.includes('owner');
  
  if (isOwner) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span>Statut propriétaire</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Badge variant="default" className="flex items-center space-x-1">
              <CheckCircle className="w-4 h-4" />
              <span>Approuvée</span>
            </Badge>
          </div>
          <p className="text-green-600 font-medium">
            Félicitations ! Vous êtes maintenant propriétaire.
          </p>
          {application?.reviewed_at && (
            <p className="text-sm text-gray-600">
              <strong>Approuvée le :</strong> {new Date(application.reviewed_at).toLocaleDateString('fr-FR')}
            </p>
          )}
          <div className="flex space-x-2">
            <Button 
              onClick={() => navigate('/owner/dashboard')}
              className="bg-green-600 hover:bg-green-700"
            >
              Accéder au dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!application) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <span>Statut propriétaire</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-600">
            Vous n'avez pas encore soumis de demande pour devenir propriétaire.
          </p>
          <Button 
            onClick={() => navigate('/become-owner')}
            className="bg-green-600 hover:bg-green-700"
          >
            Devenir propriétaire
          </Button>
        </CardContent>
      </Card>
    );
  }

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'pending':
        return {
          icon: <Clock className="w-5 h-5" />,
          variant: 'secondary' as const,
          label: 'En attente',
          color: 'text-yellow-600',
          description: 'Votre demande est en cours d\'examen par notre équipe.'
        };
      case 'under_review':
        return {
          icon: <Clock className="w-5 h-5" />,
          variant: 'default' as const,
          label: 'En cours de vérification',
          color: 'text-blue-600',
          description: 'Notre équipe examine actuellement votre demande.'
        };
      case 'approved':
        return {
          icon: <CheckCircle className="w-5 h-5" />,
          variant: 'default' as const,
          label: 'Approuvée',
          color: 'text-green-600',
          description: 'Félicitations ! Vous êtes maintenant propriétaire.'
        };
      case 'rejected':
        return {
          icon: <XCircle className="w-5 h-5" />,
          variant: 'destructive' as const,
          label: 'Refusée',
          color: 'text-red-600',
          description: 'Votre demande n\'a pas été acceptée. Vous pouvez soumettre une nouvelle demande.'
        };
      default:
        return {
          icon: <AlertCircle className="w-5 h-5" />,
          variant: 'secondary' as const,
          label: 'Statut inconnu',
          color: 'text-gray-600',
          description: 'Contactez le support pour plus d\'informations.'
        };
    }
  };

  const statusConfig = getStatusConfig(application.status);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Demande de propriétaire</span>
          <Badge variant={statusConfig.variant} className="flex items-center space-x-1">
            {statusConfig.icon}
            <span>{statusConfig.label}</span>
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className={`${statusConfig.color} font-medium`}>
          {statusConfig.description}
        </p>

        <div className="text-sm text-gray-600 space-y-2">
          <p><strong>Demande soumise le :</strong> {new Date(application.created_at).toLocaleDateString('fr-FR')}</p>
          {application.reviewed_at && (
            <p><strong>Examinée le :</strong> {new Date(application.reviewed_at).toLocaleDateString('fr-FR')}</p>
          )}
        </div>

        {application.admin_notes && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Note de l'équipe :</strong> {application.admin_notes}
            </AlertDescription>
          </Alert>
        )}

        <div className="flex space-x-2">
          {application.status === 'approved' && (
            <Button 
              onClick={() => navigate('/owner/dashboard')}
              className="bg-green-600 hover:bg-green-700"
            >
              Accéder au dashboard
            </Button>
          )}
          
          {application.status === 'rejected' && (
            <Button 
              onClick={() => navigate('/become-owner')}
              variant="outline"
            >
              Nouvelle demande
            </Button>
          )}
          
          <Button 
            onClick={() => navigate('/become-owner')}
            variant="outline"
          >
            Voir les détails
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default OwnerApplicationStatus;
