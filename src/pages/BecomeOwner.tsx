
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import Navbar from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { OtpDialog } from '@/components/owner/OtpDialog';
import { CheckCircle, MapPin, Users, Calendar, Euro } from 'lucide-react';
import { PhoneInputCI } from '@/components/ui/PhoneInputCI';

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
  const [showOtpDialog, setShowOtpDialog] = useState(false);
  const [otpPhone, setOtpPhone] = useState('');

  // Vérifier si l'utilisateur a déjà une demande ou est déjà propriétaire
  const { data: existingApplication, isLoading: checkingApplication } = useQuery({
    queryKey: ['user-owner-application', user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      const { data, error } = await supabase.rpc('get_user_owner_application', {
        p_user_id: user.id
      });

      if (error) {
        console.error('Error fetching application:', error);
        return null;
      }

      return data && data.length > 0 ? data[0] : null;
    },
    enabled: !!user
  });

  // Vérifier le profil utilisateur
  const { data: userProfile } = useQuery({
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

      const { error } = await supabase
        .from('owner_applications')
        .insert({
          user_id: user.id,
          full_name: data.full_name,
          phone: data.phone,
          experience: data.experience || null,
          motivation: data.motivation || null,
          status: 'pending'
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Demande créée !",
        description: "Veuillez maintenant vérifier votre numéro Mobile Money.",
      });
      // Trigger OTP verification
      handleRequestOtp();
    },
    onError: (error: any) => {
      console.error('Error creating application:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer votre demande. Veuillez réessayer.",
        variant: "destructive",
      });
    }
  });

  const requestOtpMutation = useMutation({
    mutationFn: async (phone: string) => {
      const { data, error } = await supabase.functions.invoke('request-owner-otp', {
        body: { phone_payout: phone }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setOtpPhone(data.phone);
      setShowOtpDialog(true);
      toast({
        title: "Code envoyé",
        description: "Un code de vérification a été envoyé par SMS",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'envoyer le code OTP",
        variant: "destructive",
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.phone) {
      toast({
        title: "Numéro de téléphone requis",
        description: "Veuillez saisir votre numéro de téléphone",
        variant: "destructive",
      });
      return;
    }

    createApplicationMutation.mutate(formData);
  };

  const handleRequestOtp = () => {
    if (formData.phone) {
      requestOtpMutation.mutate(formData.phone);
    }
  };

  const handleOtpVerified = async () => {
    try {
      // Call owners-signup to complete registration
      const { data, error } = await supabase.functions.invoke('owners-signup', {
        body: { 
          phone: formData.phone,
          otp_validated: true 
        }
      });

      if (error) throw error;

      toast({
        title: "Inscription réussie !",
        description: "Votre compte propriétaire a été créé avec succès.",
      });
      navigate('/profile');
    } catch (error: any) {
      console.error('Owner signup error:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de finaliser l'inscription",
        variant: "destructive",
      });
    }
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

  // Si l'utilisateur est déjà propriétaire - utiliser le hook usePermissions
  const { isOwner } = usePermissions();
  
  if (isOwner) {
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
                    onClick={() => navigate('/owner-dashboard')}
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

  // Si l'utilisateur a déjà une demande en cours
  if (existingApplication) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">Demande en cours</CardTitle>
              </CardHeader>
              <CardContent className="text-center space-y-4">
                <p className="text-gray-700">
                  Vous avez déjà soumis une demande pour devenir propriétaire. 
                  Notre équipe l'examine actuellement.
                </p>
                <p className="text-sm text-gray-500">
                  Statut actuel: <strong>{existingApplication.status}</strong>
                </p>
                <div className="pt-4">
                  <Button 
                    onClick={() => navigate('/profile')}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Voir le statut de ma demande
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

                   <PhoneInputCI
                     id="phone"
                     label="Numéro de téléphone"
                     value={formData.phone}
                     onChange={(value) => handleInputChange('phone', value)}
                     required
                   />
                   <p className="text-sm text-muted-foreground -mt-1">
                     Ce numéro sera utilisé pour l'authentification OTP et recevoir vos paiements Mobile Money
                   </p>

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
                     disabled={createApplicationMutation.isPending || requestOtpMutation.isPending}
                   >
                     {createApplicationMutation.isPending ? "Création en cours..." : 
                      requestOtpMutation.isPending ? "Envoi du code..." : "Soumettre ma demande"}
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

      <OtpDialog
        open={showOtpDialog}
        onOpenChange={setShowOtpDialog}
        phone={otpPhone}
        onVerified={handleOtpVerified}
      />
    </div>
  );
};

export default BecomeOwner;
