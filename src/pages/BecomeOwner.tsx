
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import Navbar from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, MapPin, Users, Calendar, Euro } from 'lucide-react';

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

  const becomeOwnerMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!user) throw new Error('User not authenticated');

      // Mettre à jour le profil pour devenir propriétaire
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          email: user.email,
          full_name: data.full_name,
          phone: data.phone,
          user_type: 'owner'
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Félicitations !",
        description: "Vous êtes maintenant propriétaire. Vous pouvez ajouter vos terrains.",
      });
      navigate('/owner/dashboard');
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible de vous inscrire comme propriétaire.",
        variant: "destructive",
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    becomeOwnerMutation.mutate(formData);
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
                  <span className="text-gray-700">Inscrivez-vous comme propriétaire</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-gray-700">Ajoutez vos terrains avec photos et détails</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-gray-700">Définissez vos tarifs et disponibilités</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-gray-700">Recevez des réservations et générez des revenus</span>
                </div>
              </div>
            </div>
          </div>

          {/* Formulaire d'inscription */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl text-center">
                  Rejoignez-nous maintenant
                </CardTitle>
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
                      placeholder="Décrivez votre expérience (optionnel)"
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label htmlFor="motivation">Pourquoi souhaitez-vous devenir propriétaire ?</Label>
                    <Textarea
                      id="motivation"
                      value={formData.motivation}
                      onChange={(e) => handleInputChange('motivation', e.target.value)}
                      placeholder="Parlez-nous de votre motivation (optionnel)"
                      rows={3}
                    />
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full bg-green-600 hover:bg-green-700"
                    disabled={becomeOwnerMutation.isPending}
                  >
                    {becomeOwnerMutation.isPending ? "Inscription..." : "Devenir propriétaire"}
                  </Button>

                  <p className="text-sm text-gray-500 text-center">
                    En vous inscrivant, vous acceptez nos conditions d'utilisation 
                    et notre politique de confidentialité.
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
