
import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, ExternalLink, CheckCircle, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';

const StripeOnboarding = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);

  const { data: paymentAccount, isLoading, refetch } = useQuery({
    queryKey: ['payment-account-stripe', user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      const { data, error } = await supabase
        .from('payment_accounts')
        .select('*')
        .eq('owner_id', user.id)
        .eq('payment_provider', 'stripe')
        .single();
      
      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      
      return data;
    },
    enabled: !!user
  });

  const handleCreateStripeAccount = async () => {
    if (!user) return;

    setIsCreatingAccount(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-stripe-account');
      
      if (error) throw error;
      
      if (data.onboarding_url) {
        // Ouvrir le processus d'onboarding Stripe dans un nouvel onglet
        window.open(data.onboarding_url, '_blank');
        
        toast({
          title: "Redirection vers Stripe",
          description: "Complétez votre inscription sur Stripe pour commencer à recevoir des paiements.",
        });
        
        // Rafraîchir les données après un délai
        setTimeout(() => {
          refetch();
        }, 2000);
      }
    } catch (error: any) {
      console.error('Erreur création compte Stripe:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de créer le compte Stripe",
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
          <span>Configuration des paiements Stripe</span>
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
                Pourquoi configurer Stripe ?
              </h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Recevez automatiquement 95% du montant des réservations</li>
                <li>• Paiements sécurisés en franc CFA (XOF)</li>
                <li>• Virements directs sur votre compte bancaire</li>
                <li>• Commission de la plateforme : 5%</li>
              </ul>
            </div>
            
            <Button 
              onClick={handleCreateStripeAccount}
              disabled={isCreatingAccount}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              {isCreatingAccount ? (
                "Création en cours..."
              ) : (
                <>
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Configurer mon compte Stripe
                </>
              )}
            </Button>
          </div>
        ) : !paymentAccount.charges_enabled ? (
          <div className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="font-medium text-yellow-900 mb-2">
                Configuration incomplète
              </h4>
              <p className="text-sm text-yellow-800">
                Votre compte Stripe nécessite des informations supplémentaires pour recevoir des paiements.
              </p>
            </div>
            
            {paymentAccount.onboarding_url && (
              <Button 
                onClick={() => window.open(paymentAccount.onboarding_url, '_blank')}
                className="w-full bg-yellow-600 hover:bg-yellow-700"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Terminer la configuration
              </Button>
            )}
          </div>
        ) : (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h4 className="font-medium text-green-900 mb-2">
              Compte configuré avec succès !
            </h4>
            <p className="text-sm text-green-800">
              Vous pouvez maintenant recevoir des paiements directement sur votre compte.
              Les fonds seront virés automatiquement après chaque réservation.
            </p>
          </div>
        )}

        <div className="text-xs text-gray-500 space-y-1">
          <p>• Commission de la plateforme : 5%</p>
          <p>• Frais Stripe : ~2.9% + frais fixes</p>
          <p>• Vous recevez : ~92% du montant total</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default StripeOnboarding;
