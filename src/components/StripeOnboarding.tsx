
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
      // Créer un enregistrement simple dans payment_accounts
      const { error: accountError } = await supabase
        .from('payment_accounts')
        .insert({
          owner_id: user.id
        });

      if (accountError) throw accountError;
      
      toast({
        title: "Compte Stripe configuré",
        description: "Votre compte Stripe est maintenant configuré.",
      });
      
      refetch();
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
                <li>• Recevez automatiquement vos revenus des réservations</li>
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
                "Configuration en cours..."
              ) : (
                <>
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Configurer mon compte Stripe
                </>
              )}
            </Button>
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
