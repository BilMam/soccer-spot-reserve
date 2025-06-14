
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

const OwnerApplicationStatus = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: application, isLoading } = useQuery({
    queryKey: ['owner-application', user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      const { data, error } = await supabase
        .from('owner_applications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
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
