
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
import { CheckCircle, MapPin, Users, Calendar } from 'lucide-react';
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

  // Vérifier le statut du propriétaire
  const { data: ownerStatus, isLoading: checkingOwner } = useQuery({
    queryKey: ['owner-status', user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      try {
        // Try to fetch with status column first
        const { data, error } = await supabase
          .from('owners')
          .select('id, phone, status, cinetpay_contact_id, created_at')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
          // If error is due to missing status column, fallback to old structure
          if (error.code === 'PGRST203') {
            console.log('Status column not found, falling back to legacy structure');
            const { data: legacyData, error: legacyError } = await supabase
              .from('owners')
              .select('id, phone, cinetpay_contact_id, created_at')
              .eq('user_id', user.id)
              .maybeSingle();
            
            if (legacyError && legacyError.code !== 'PGRST116') {
              console.error('Error fetching owner:', legacyError);
              return null;
            }
            
            // If owner exists in legacy format, treat as approved
            if (legacyData) {
              return {
                id: (legacyData as any).id,
                phone: (legacyData as any).phone || '',
                status: 'approved' as const,
                cinetpay_contact_id: (legacyData as any).cinetpay_contact_id || null,
                created_at: (legacyData as any).created_at || ''
              };
            }
            return null;
          }
          
          if (error.code !== 'PGRST116') {
            console.error('Error fetching owner:', error);
            return null;
          }
        }

        return data;
      } catch (error) {
        console.error('Unexpected error fetching owner:', error);
        return null;
      }
    },
    enabled: !!user
  });


  const requestOtpForSignupMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!user) throw new Error('User not authenticated');

      // Request OTP directly for signup
      const { data: otpData, error } = await supabase.functions.invoke('request-owner-otp', {
        body: { phone_payout: data.phone }
      });

      if (error) throw error;
      return otpData;
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
      console.error('Error requesting OTP:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer le code OTP. Veuillez réessayer.",
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

    requestOtpForSignupMutation.mutate(formData);
  };

  const handleOtpVerified = async () => {
    try {
      // Verify user is authenticated
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        throw new Error('Vous devez être connecté pour devenir propriétaire');
      }

      // Call owners-signup to complete registration with authentication
      const { data, error } = await supabase.functions.invoke('owners-signup', {
        body: { 
          phone: formData.phone,
          otp_validated: true 
        },
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        }
      });

      if (error) throw error;

      // Check if signup was actually successful
      if (!data.success) {
        console.error('Owner signup failed:', data);
        
        let errorTitle = "Erreur d'inscription";
        let errorDescription = data.message || "Impossible de finaliser l'inscription";
        
        // Customize error message based on error code
        if (data.code === 'CINETPAY_ERROR') {
          errorTitle = "Service temporairement indisponible";
          errorDescription = "Problème avec le service de paiement. Veuillez réessayer dans quelques minutes.";
        } else if (data.code === 'DUPLICATE_OWNER') {
          errorTitle = "Compte déjà existant";
          errorDescription = "Un compte propriétaire existe déjà avec ce numéro.";
        } else if (data.code === 'SCHEMA_ERROR') {
          errorTitle = "Erreur système";
          errorDescription = "Mise à jour système en cours. Veuillez réessayer plus tard.";
        }
        
        toast({
          title: errorTitle,
          description: errorDescription,
          variant: "destructive",
        });
        
        // Don't navigate away - keep user on form to retry
        return;
      }

      // Only proceed if signup was successful AND we have required data
      if (!data.owner_id) {
        toast({
          title: "Erreur de validation",
          description: "Inscription incomplète. Veuillez réessayer.",
          variant: "destructive",
        });
        return;
      }

      // Success - show success message for pending status
      console.log('Owner signup successful:', data);
      toast({
        title: "Demande soumise !",
        description: "Votre demande de propriétaire est en attente de validation admin.",
      });
      
      // Refresh owner status to show pending state
      window.location.reload();
      
    } catch (error: any) {
      console.error('Owner signup error:', error);
      
      let errorTitle = "Erreur d'inscription";
      let errorDescription = "Une erreur inattendue s'est produite";
      
      if (error.message?.includes('connecté')) {
        errorTitle = "Authentification requise";
        errorDescription = "Vous devez être connecté pour devenir propriétaire";
      } else if (error.message?.includes('Invalid or expired token')) {
        errorTitle = "Session expirée";
        errorDescription = "Veuillez vous reconnecter et réessayer";
      } else if (error.message?.includes('authorization')) {
        errorTitle = "Erreur d'authentification";
        errorDescription = "Problème d'authentification. Veuillez vous reconnecter";
      } else {
        errorDescription = "Impossible de contacter le serveur. Vérifiez votre connexion.";
      }
      
      toast({
        title: errorTitle,
        description: errorDescription,
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

  if (checkingOwner) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container mx-auto px-4 py-8 text-center">
          <div className="animate-pulse">Chargement...</div>
        </div>
      </div>
    );
  }

  // Status-based rendering for owner workflow
  if (ownerStatus && typeof ownerStatus === 'object' && 'status' in ownerStatus) {
    // Pending approval status
    if ((ownerStatus as any).status === 'pending') {
      return (
        <div className="min-h-screen bg-gray-50">
          <Navbar />
          <div className="container mx-auto px-4 py-8">
            <div className="max-w-2xl mx-auto">
              <Card className="border-yellow-200 bg-yellow-50 border-2">
                <CardHeader className="text-center">
                  <div className="flex justify-center mb-4">
                    <div className="w-6 h-6 bg-yellow-500 rounded-full animate-pulse" />
                  </div>
                  <CardTitle className="text-2xl">Demande en cours</CardTitle>
                </CardHeader>
                <CardContent className="text-center space-y-4">
                  <p className="text-gray-700">
                    Votre demande de propriétaire a été soumise avec succès. 
                    Un administrateur doit valider votre profil avant l'activation.
                  </p>
                  <p className="text-sm text-gray-600">
                    Numéro de téléphone: {'phone' in ownerStatus ? (ownerStatus.phone || 'N/A') : 'N/A'}
                  </p>

                  <div className="pt-4">
                    <Button 
                      onClick={() => navigate('/profile')}
                      variant="outline"
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

    // Approved status with CinetPay contact
    if ((ownerStatus as any).status === 'approved' && (ownerStatus as any).cinetpay_contact_id) {
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
                  <p className="text-gray-700">
                    Félicitations ! Vous êtes maintenant propriétaire. 
                    Vous pouvez commencer à ajouter vos terrains.
                  </p>

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

    // Rejected status
    if ((ownerStatus as any).status === 'rejected') {
      return (
        <div className="min-h-screen bg-gray-50">
          <Navbar />
          <div className="container mx-auto px-4 py-8">
            <div className="max-w-2xl mx-auto">
              <Card className="border-red-200 bg-red-50 border-2">
                <CardHeader className="text-center">
                  <div className="flex justify-center mb-4">
                    <div className="w-6 h-6 bg-red-500 rounded-full" />
                  </div>
                  <CardTitle className="text-2xl">Demande refusée</CardTitle>
                </CardHeader>
                <CardContent className="text-center space-y-4">
                  <p className="text-gray-700">
                    Votre demande de propriétaire n'a pas été approuvée. 
                    Contactez notre support pour plus d'informations.
                  </p>

                  <div className="pt-4">
                    <Button 
                      onClick={() => navigate('/profile')}
                      variant="outline"
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
  }


  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Devenez propriétaire sur MySport
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Rejoignez notre communauté de propriétaires et commencez à générer des revenus 
            en louant vos terrains de sport à des joueurs passionnés.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Avantages */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Pourquoi devenir propriétaire ?
            </h2>
            
            <div className="space-y-6">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-2xl font-bold text-green-600">₣</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Revenus supplémentaires
                  </h3>
                  <p className="text-gray-600">
                    Rentabilisez vos terrains inoccupés.
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
                    Gérez vos réservations depuis un seul tableau de bord.
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
                    Rejoignez des centaines de propriétaires sportifs.
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
                    Vos terrains visibles par des milliers de joueurs.
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
                  <span className="text-gray-700">Envoyez votre demande</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-gray-700">Nous validons votre profil</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-gray-700">Ajoutez vos terrains</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-gray-700">Recevez vos revenus</span>
                </div>
              </div>
            </div>
          </div>

          {/* Formulaire de demande */}
          <div className="max-w-md">
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl text-center">
                  Soumettre votre demande
                </CardTitle>
                <p className="text-center text-gray-600">
                  Remplissez le formulaire ci-dessous.
                </p>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
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
                     Numéro ivoirien 10 chiffres (Wave / Orange / MTN / Moov). Ce numéro servira à l'OTP et aux paiements Mobile Money.
                   </p>

                  <div>
                    <Label htmlFor="experience">Expérience dans la gestion de terrains</Label>
                    <Textarea
                      id="experience"
                      value={formData.experience}
                      onChange={(e) => handleInputChange('experience', e.target.value)}
                      placeholder="Votre expérience (optionnel)"
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label htmlFor="motivation">Pourquoi souhaitez-vous devenir propriétaire ?</Label>
                    <Textarea
                      id="motivation"
                      value={formData.motivation}
                      onChange={(e) => handleInputChange('motivation', e.target.value)}
                      placeholder="Votre motivation (optionnel)"
                      rows={3}
                    />
                  </div>

                   <Button 
                     type="submit" 
                     className="w-full bg-green-600 hover:bg-green-700"
                     disabled={requestOtpForSignupMutation.isPending}
                   >
                     {requestOtpForSignupMutation.isPending ? "Envoi du code..." : "Devenir propriétaire"}
                   </Button>

                  <p className="text-sm text-gray-500 text-center">
                    En devenant propriétaire, vous acceptez nos conditions d'utilisation 
                    et notre politique de confidentialité. Votre inscription sera activée 
                    immédiatement après validation OTP.
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
