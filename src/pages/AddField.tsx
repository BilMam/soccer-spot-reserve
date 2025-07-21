import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import Navbar from '@/components/Navbar';
import FieldForm from '@/components/FieldForm';
import ErrorAlert from '@/components/ErrorAlert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface FieldFormData {
  name: string;
  description: string;
  location: string;
  address: string;
  city: string;
  price_per_hour: number;
  capacity: number;
  field_type: 'natural_grass' | 'synthetic' | 'street';
  availability_start: string;
  availability_end: string;
  amenities: string[];
  images: string[];
  latitude?: number;
  longitude?: number;
  payout_account_id?: string;
}

const AddField = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const createFieldMutation = useMutation({
    mutationFn: async (fieldData: FieldFormData) => {
      console.log('Creating field with data:', fieldData);
      
      if (!user) {
        throw new Error('Utilisateur non connecté');
      }

      // Vérifier que les coordonnées GPS sont présentes
      if (!fieldData.latitude || !fieldData.longitude) {
        throw new Error('Coordonnées GPS manquantes. Veuillez localiser le terrain avant de soumettre.');
      }

      // Vérifier que l'utilisateur a un profil
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError || !profile) {
        console.error('Profile error:', profileError);
        
        // Créer le profil s'il n'existe pas
        const { error: createProfileError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            email: user.email,
            full_name: user.user_metadata?.full_name || 'Propriétaire'
          });

        if (createProfileError) {
          console.error('Create profile error:', createProfileError);
          throw new Error('Impossible de créer le profil utilisateur');
        }
      }
      
      // S'assurer que l'utilisateur a le rôle owner
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: user.id,
          role: 'owner',
          granted_by: user.id,
          notes: 'Auto-assigned when adding first field'
        })
        .select()
        .single();

      // Ignorer l'erreur de conflit (l'utilisateur a déjà le rôle)
      if (roleError && !roleError.message?.includes('duplicate key')) {
        console.error('Role assignment error:', roleError);
      }

      // Utiliser l'edge function pour créer le terrain
      const { data, error } = await supabase.functions.invoke('create-field', {
        body: {
          name: fieldData.name,
          description: fieldData.description,
          location: fieldData.location,
          address: fieldData.address,
          city: fieldData.city,
          price_per_hour: fieldData.price_per_hour,
          capacity: fieldData.capacity,
          field_type: fieldData.field_type,
          amenities: fieldData.amenities,
          images: fieldData.images,
          availability_start: fieldData.availability_start,
          availability_end: fieldData.availability_end,
          latitude: fieldData.latitude,
          longitude: fieldData.longitude,
          payout_account_id: fieldData.payout_account_id
        }
      });

      if (error) {
        console.error('Field creation error:', error);
        throw error;
      }

      console.log('Field created successfully with GPS coordinates:', data);
      return data.field;
    },
    onSuccess: (data) => {
      console.log('Field created successfully:', data);
      setSuccess(true);
      setError(null);
      
      // Invalider le cache des terrains pour rafraîchir la carte
      queryClient.invalidateQueries({ queryKey: ['fields'] });
      
      toast.success('Terrain soumis avec succès ! En attente d\'approbation.');
      
      // Rediriger vers le dashboard après 3 secondes
      setTimeout(() => {
        navigate('/owner-dashboard');
      }, 3000);
    },
    onError: (error: any) => {
      console.error('Mutation error:', error);
      
      let errorMessage = 'Une erreur inattendue s\'est produite';
      
      if (error?.message) {
        if (error.message.includes('Coordonnées GPS manquantes')) {
          errorMessage = 'Veuillez localiser le terrain en saisissant une adresse valide ou en utilisant votre position GPS.';
        } else if (error.message.includes('violates row-level security')) {
          errorMessage = 'Vous n\'avez pas les permissions pour créer un terrain. Veuillez vous connecter en tant que propriétaire.';
        } else if (error.message.includes('duplicate key value')) {
          errorMessage = 'Un terrain avec ces informations existe déjà.';
        } else if (error.message.includes('invalid input syntax')) {
          errorMessage = 'Certaines données sont invalides. Vérifiez les champs numériques et les heures.';
        } else {
          errorMessage = error.message;
        }
      }
      
      setError(errorMessage);
      setSuccess(false);
      toast.error('Échec de la soumission du terrain');
    }
  });

  const handleSubmit = async (fieldData: FieldFormData) => {
    setError(null);
    setSuccess(false);
    createFieldMutation.mutate(fieldData);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container mx-auto px-4 py-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Accès non autorisé</h1>
          <p className="text-gray-600">Vous devez être connecté pour ajouter un terrain.</p>
          <Button 
            className="mt-4" 
            onClick={() => navigate('/auth')}
          >
            Se connecter
          </Button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <Card className="max-w-md mx-auto">
            <CardContent className="text-center py-8">
              <Clock className="w-16 h-16 text-yellow-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Terrain soumis !</h2>
              <p className="text-gray-600 mb-4">
                Votre terrain a été soumis avec succès. Il est maintenant en attente d'approbation par notre équipe.
              </p>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-yellow-800">
                  <strong>Prochaines étapes :</strong><br />
                  • Notre équipe va examiner votre terrain<br />
                  • Vous recevrez une notification par email<br />
                  • Une fois approuvé, il sera visible sur la plateforme
                </p>
              </div>
              <Button onClick={() => navigate('/owner-dashboard')}>
                Aller au dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center space-x-4 mb-8">
            <Button 
              variant="outline" 
              onClick={() => navigate(-1)}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Retour</span>
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Ajouter un terrain</h1>
              <p className="text-gray-600">Créez votre annonce de terrain de football</p>
            </div>
          </div>

          {error && (
            <ErrorAlert 
              title="Erreur lors de la création"
              message={error}
              onDismiss={() => setError(null)}
            />
          )}

          <FieldForm 
            onSubmit={handleSubmit}
            isLoading={createFieldMutation.isPending}
          />
        </div>
      </div>
    </div>
  );
};

export default AddField;
