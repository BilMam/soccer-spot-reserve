
import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, CheckCircle, Clock, Smartphone, CreditCard } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';

const CinetPayOnboarding = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    business_name: '',
    owner_name: user?.user_metadata?.full_name || '',
    phone: '',
    email: user?.email || '',
    address: ''
  });

  const { data: paymentAccount, isLoading, refetch } = useQuery({
    queryKey: ['payment-account', user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      const { data, error } = await supabase
        .from('payment_accounts')
        .select('*')
        .eq('owner_id', user.id)
        .eq('payment_provider', 'cinetpay')
        .single();
      
      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      
      return data;
    },
    enabled: !!user
  });

  const handleCreateMerchantAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsCreatingAccount(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-cinetpay-merchant', {
        body: formData
      });
      
      if (error) throw error;
      
      toast({
        title: "Compte marchand créé avec succès",
        description: "Votre compte CinetPay est en cours de vérification. Vous pourrez recevoir des paiements une fois approuvé.",
      });
      
      setShowForm(false);
      refetch();
    } catch (error: any) {
      console.error('Erreur création compte marchand:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de créer le compte marchand",
        variant: "destructive"
      });
    } finally {
      setIsCreatingAccount(false);
    }
  };

  const getStatusIcon = () => {
    if (!paymentAccount) return <Clock className="w-5 h-5 text-gray-500" />;
    
    if (paymentAccount.charges_enabled && paymentAccount.payouts_enabled) {
      return <CheckCircle className="w-5 h-5 text-green-600" />;
    } else if (paymentAccount.details_submitted) {
      return <Clock className="w-5 h-5 text-yellow-600" />;
    } else {
      return <AlertCircle className="w-5 h-5 text-red-600" />;
    }
  };

  const getStatusText = () => {
    if (!paymentAccount) return "Non configuré";
    
    if (paymentAccount.charges_enabled && paymentAccount.payouts_enabled) {
      return "Compte vérifié et actif";
    } else if (paymentAccount.details_submitted) {
      return "En cours de vérification";
    } else {
      return "Configuration incomplète";
    }
  };

  const getStatusColor = () => {
    if (!paymentAccount) return "text-gray-600";
    
    if (paymentAccount.charges_enabled && paymentAccount.payouts_enabled) {
      return "text-green-600";
    } else if (paymentAccount.details_submitted) {
      return "text-yellow-600";
    } else {
      return "text-red-600";
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-8 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          {getStatusIcon()}
          <span>Configuration des paiements CinetPay</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="font-medium">Statut du compte :</span>
          <span className={`font-medium ${getStatusColor()}`}>
            {getStatusText()}
          </span>
        </div>

        {!paymentAccount ? (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">
                Pourquoi configurer CinetPay ?
              </h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Recevez automatiquement 95% du montant des réservations</li>
                <li>• Paiements sécurisés en franc CFA (XOF)</li>
                <li>• Support Mobile Money : Orange Money, MTN Money, Moov Money</li>
                <li>• Virements directs sur votre compte bancaire</li>
                <li>• Commission de la plateforme : 5%</li>
              </ul>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-medium text-green-900 mb-2 flex items-center">
                <Smartphone className="w-4 h-4 mr-2" />
                Moyens de paiement supportés
              </h4>
              <div className="grid grid-cols-2 gap-2 text-sm text-green-800">
                <div className="flex items-center space-x-1">
                  <Smartphone className="w-3 h-3" />
                  <span>Orange Money</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Smartphone className="w-3 h-3" />
                  <span>MTN Money</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Smartphone className="w-3 h-3" />
                  <span>Moov Money</span>
                </div>
                <div className="flex items-center space-x-1">
                  <CreditCard className="w-3 h-3" />
                  <span>Cartes bancaires</span>
                </div>
              </div>
            </div>
            
            {!showForm ? (
              <Button 
                onClick={() => setShowForm(true)}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                Configurer mon compte CinetPay
              </Button>
            ) : (
              <form onSubmit={handleCreateMerchantAccount} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="business_name">Nom de l'entreprise/activité</Label>
                  <Input
                    id="business_name"
                    value={formData.business_name}
                    onChange={(e) => setFormData({...formData, business_name: e.target.value})}
                    placeholder="Ex: Terrain de Football Yopougon"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="owner_name">Nom du propriétaire</Label>
                  <Input
                    id="owner_name"
                    value={formData.owner_name}
                    onChange={(e) => setFormData({...formData, owner_name: e.target.value})}
                    placeholder="Votre nom complet"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Numéro de téléphone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    placeholder="Ex: +225 07 XX XX XX XX"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    placeholder="votre@email.com"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Adresse complète</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                    placeholder="Adresse de votre établissement"
                    required
                  />
                </div>

                <div className="flex space-x-3">
                  <Button 
                    type="button"
                    variant="outline" 
                    onClick={() => setShowForm(false)}
                    className="flex-1"
                  >
                    Annuler
                  </Button>
                  <Button 
                    type="submit"
                    disabled={isCreatingAccount}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    {isCreatingAccount ? "Création..." : "Créer le compte"}
                  </Button>
                </div>
              </form>
            )}
          </div>
        ) : !paymentAccount.charges_enabled ? (
          <div className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="font-medium text-yellow-900 mb-2">
                Vérification en cours
              </h4>
              <p className="text-sm text-yellow-800">
                Votre compte CinetPay est en cours de vérification. Vous pourrez recevoir des paiements une fois l'approbation terminée.
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h4 className="font-medium text-green-900 mb-2">
              Compte configuré avec succès !
            </h4>
            <p className="text-sm text-green-800">
              Vous pouvez maintenant recevoir des paiements directement sur votre compte CinetPay.
              Les fonds seront virés automatiquement après chaque réservation.
            </p>
          </div>
        )}

        <div className="text-xs text-gray-500 space-y-1">
          <p>• Commission de la plateforme : 5%</p>
          <p>• Frais CinetPay : ~2.5% + frais fixes</p>
          <p>• Vous recevez : ~92.5% du montant total</p>
          <p>• Support Mobile Money et cartes bancaires</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default CinetPayOnboarding;
