
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import Navbar from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, MapPin, Users, Calendar, Euro, Clock, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface OwnerApplicationData {
  id: string;
  user_id: string;
  full_name: string;
  phone: string;
  experience?: string;
  motivation?: string;
  status: 'pending' | 'approved' | 'rejected' | 'under_review';
  admin_notes?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  created_at: string;
  updated_at: string;
}

const BecomeOwner = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    experience: '',
    motivation: ''
  });

  // Vérifier si l'utilisateur a déjà une demande en cours ou est déjà propriétaire
  const { data: userProfile, isLoading: checkingApplication } = useQuery({
    queryKey: ['user-profile', user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!user
  });

  const createApplicationMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!user) throw new Error('User not authenticated');

      // Pour l'instant, mettre à jour directement le profil utilisateur
      // En attendant que les types Supabase soient mis à jour avec la nouvelle table
      const { error } = await supabase
        .from('profiles')
        .update({ user_type: 'owner' })
        .eq('id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Demande envoyée !",
        description: "Votre demande a été soumise avec succès. Nous l'examinerons dans les plus brefs délais.",
      });
      navigate('/profile');
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer votre demande. Veuillez réessayer.",
        variant: "destructive",
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createApplicationMutation.mutate(formData);
  };

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container mx-auto px-4 py-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Connexion requise</h1>
          <p className="text-gray-600 mb-6">Vous devez être connecté pour devenir propriétaire.</p>
          <Button onClick={() => navigate('/auth')} className="bg-green-600 hover:bg-green-700">
            Se connecter
          </Button>
        </div>
      </div>
    );
  }

  if (checkingApplication) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container mx-auto px-4 py-8 text-center">
          <div className="animate-pulse">Chargement...</div>
        </div>
      </div>
    );
  }

  // Si l'utilisateur est déjà propriétaire
  if (userProfile?.user_type === 'owner') {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <Card className="border-green-200 bg-green-50 border-2">
              <CardHeader className="text-center">
                <div className="flex justify-center mb-4">
                  <CheckCircle className="w-6 h-6 text-green-500" />
                </div>
                <CardTitle className="text-2xl">Demande approuvée !</CardTitle>
              </CardHeader>
              <CardContent className="text-center space-y-4">
                <p className="text-gray-700">Félicitations ! Vous êtes maintenant propriétaire. Vous pouvez commencer à ajouter vos terrains.</p>

                <div className="pt-4">
                  <Button 
                    onClick={() => navigate('/owner/dashboard')}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Accéder au dashboard propriétaire
                  </Button>
                  
                  <Button 
                    onClick={() => navigate('/profile')}
                    variant="outline"
                    className="ml-4"
                  >
                    Retour au profil
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Devenez propriétaire sur FieldBook
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Rejoignez notre communauté de propriétaires et commencez à générer des revenus 
            en louant vos terrains de sport à des joueurs passionnés.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Avantages */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Pourquoi devenir propriétaire ?
            </h2>
            
            <div className="space-y-6">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Euro className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Revenus supplémentaires
                  </h3>
                  <p className="text-gray-600">
                    Monétisez vos terrains inutilisés et générez des revenus passifs 
                    en les louant à des équipes et des joueurs.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Gestion simplifiée
                  </h3>
                  <p className="text-gray-600">
                    Notre plateforme vous permet de gérer facilement vos réservations, 
                    vos tarifs et la disponibilité de vos terrains.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Users className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Communauté active
                  </h3>
                  <p className="text-gray-600">
                    Rejoignez une communauté de propriétaires passionnés et 
                    bénéficiez de notre support dédié.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Visibilité maximale
                  </h3>
                  <p className="text-gray-600">
                    Votre terrain sera visible par des milliers de joueurs 
                    recherchant des espaces de qualité pour pratiquer leur sport.
                  </p>
                </div>
              </div>
            </div>

            {/* Processus */}
            <div className="mt-10">
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                Comment ça marche ?
              </h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-gray-700">Soumettez votre demande de propriétaire</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-gray-700">Notre équipe examine votre profil</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-gray-700">Une fois approuvé, ajoutez vos terrains</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-gray-700">Recevez des réservations et générez des revenus</span>
                </div>
              </div>
            </div>
          </div>

          {/* Formulaire de demande */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl text-center">
                  Soumettre votre demande
                </CardTitle>
                <p className="text-center text-gray-600">
                  Remplissez ce formulaire pour devenir propriétaire. Notre équipe examinera votre demande.
                </p>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <Label htmlFor="full_name">Nom complet *</Label>
                    <Input
                      id="full_name"
                      type="text"
                      value={formData.full_name}
                      onChange={(e) => handleInputChange('full_name', e.target.value)}
                      placeholder="Votre nom complet"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="phone">Téléphone *</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      placeholder="Votre numéro de téléphone"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="experience">Expérience dans la gestion de terrains</Label>
                    <Textarea
                      id="experience"
                      value={formData.experience}
                      onChange={(e) => handleInputChange('experience', e.target.value)}
                      placeholder="Décrivez votre expérience avec la gestion de terrains de sport (optionnel)"
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label htmlFor="motivation">Pourquoi souhaitez-vous devenir propriétaire ?</Label>
                    <Textarea
                      id="motivation"
                      value={formData.motivation}
                      onChange={(e) => handleInputChange('motivation', e.target.value)}
                      placeholder="Parlez-nous de votre motivation et de vos objectifs (optionnel)"
                      rows={3}
                    />
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full bg-green-600 hover:bg-green-700"
                    disabled={createApplicationMutation.isPending}
                  >
                    {createApplicationMutation.isPending ? "Envoi en cours..." : "Soumettre ma demande"}
                  </Button>

                  <p className="text-sm text-gray-500 text-center">
                    En soumettant cette demande, vous acceptez nos conditions d'utilisation 
                    et notre politique de confidentialité. Notre équipe examinera votre demande 
                    dans un délai de 2-3 jours ouvrables.
                  </p>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BecomeOwner;
