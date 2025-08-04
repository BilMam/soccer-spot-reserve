
import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, CheckCircle, Clock, Smartphone, CreditCard } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useOwnerPaymentAccount } from '@/hooks/useOwnerPaymentAccount';

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

  const { data: paymentAccount, isLoading, refetch } = useOwnerPaymentAccount();

  const handleCreateMerchantAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsCreatingAccount(true);
    try {
      // Créer un enregistrement simple dans payment_accounts
      const { error: accountError } = await supabase
        .from('payment_accounts')
        .insert({
          owner_id: user.id
        });

      if (accountError) throw accountError;
      
      toast({
        title: "Compte configuré avec succès",
        description: "Votre compte de paiement est maintenant configuré.",
      });
      
      setShowForm(false);
      refetch();
    } catch (error: any) {
      console.error('Erreur configuration compte:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de configurer le compte",
        variant: "destructive"
      });
    } finally {
      setIsCreatingAccount(false);
    }
  };

  const getStatusIcon = () => {
    if (!paymentAccount) return <Clock className="w-5 h-5 text-gray-500" />;
    return <CheckCircle className="w-5 h-5 text-green-600" />;
  };

  const getStatusText = () => {
    if (!paymentAccount) return "Non configuré";
    return "Compte configuré";
  };

  const getStatusColor = () => {
    if (!paymentAccount) return "text-gray-600";
    return "text-green-600";
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
          <span>Configuration des paiements</span>
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
                Pourquoi configurer les paiements ?
              </h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Recevez automatiquement vos revenus des réservations</li>
                <li>• Paiements sécurisés en franc CFA (XOF)</li>
                <li>• Support Mobile Money et cartes bancaires</li>
                <li>• Gestion simplifiée des transactions</li>
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
                Configurer les paiements
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
                    {isCreatingAccount ? "Configuration..." : "Configurer"}
                  </Button>
                </div>
              </form>
            )}
          </div>
        ) : (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h4 className="font-medium text-green-900 mb-2">
              Compte configuré avec succès !
            </h4>
            <p className="text-sm text-green-800">
              Votre compte de paiement est maintenant configuré. 
              Vous pouvez recevoir des paiements directement.
            </p>
          </div>
        )}

        <div className="text-xs text-gray-500 space-y-1">
          <p>• Commission de la plateforme : 5%</p>
          <p>• Vous recevez : 95% du montant total</p>
          <p>• Support Mobile Money et cartes bancaires</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default CinetPayOnboarding;
