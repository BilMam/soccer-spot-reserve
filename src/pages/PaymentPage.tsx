
import React, { useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { 
  CreditCard, 
  Smartphone, 
  Building, 
  ArrowLeft,
  Check,
  Shield,
  Clock,
  MapPin,
  Calendar
} from 'lucide-react';

interface PaymentState {
  bookingData: any;
  selectedDate: Date;
  selectedStartTime: string;
  selectedEndTime: string;
  totalPrice: number;
  playerCount: number;
}

const PaymentPage = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedMethod, setSelectedMethod] = useState<string>('');

  const paymentData = location.state as PaymentState;

  const { data: field } = useQuery({
    queryKey: ['field', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fields')
        .select('*, profiles!fields_owner_id_fkey (full_name, phone)')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    }
  });

  const paymentMethods = [
    {
      id: 'mobile_money',
      name: 'Mobile Money',
      description: 'Orange Money, MTN Money, Moov Money',
      icon: Smartphone,
      popular: true
    },
    {
      id: 'bank_card',
      name: 'Carte bancaire',
      description: 'Visa, Mastercard',
      icon: CreditCard,
      popular: false
    },
    {
      id: 'bank_transfer',
      name: 'Virement bancaire',
      description: 'Virement direct depuis votre banque',
      icon: Building,
      popular: false
    }
  ];

  const handlePaymentMethodSelect = (methodId: string) => {
    setSelectedMethod(methodId);
  };

  const handleProceedToPayment = () => {
    if (!selectedMethod || !paymentData) return;

    // Rediriger vers la page de checkout avec la méthode sélectionnée
    navigate(`/checkout/${id}`, {
      state: {
        ...paymentData,
        paymentMethod: selectedMethod
      }
    });
  };

  if (!paymentData || !field) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-md mx-auto text-center">
            <h2 className="text-xl font-semibold mb-4">Données manquantes</h2>
            <Button onClick={() => navigate('/')}>
              Retour à l'accueil
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center mb-6">
            <Button 
              variant="ghost" 
              onClick={() => navigate(`/field/${id}`)}
              className="mr-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Choisir un moyen de paiement</h1>
              <p className="text-gray-600">Sélectionnez votre méthode de paiement préférée</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Méthodes de paiement */}
            <div className="lg:col-span-2 space-y-4">
              <h2 className="text-lg font-semibold">Moyens de paiement</h2>
              
              {paymentMethods.map((method) => (
                <Card 
                  key={method.id}
                  className={`cursor-pointer transition-all ${
                    selectedMethod === method.id 
                      ? 'ring-2 ring-green-500 border-green-500' 
                      : 'hover:border-gray-300'
                  }`}
                  onClick={() => handlePaymentMethodSelect(method.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className={`p-3 rounded-lg ${
                          selectedMethod === method.id 
                            ? 'bg-green-100 text-green-600' 
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          <method.icon className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <h3 className="font-medium">{method.name}</h3>
                            {method.popular && (
                              <Badge variant="secondary" className="text-xs">
                                Populaire
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-600">{method.description}</p>
                        </div>
                      </div>
                      
                      {selectedMethod === method.id && (
                        <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                          <Check className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}

              {/* Informations de sécurité */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
                <div className="flex items-start space-x-3">
                  <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-blue-900">Paiement sécurisé</h4>
                    <p className="text-sm text-blue-800 mt-1">
                      Vos informations de paiement sont protégées par un cryptage de niveau bancaire. 
                      Nous ne stockons jamais vos données de carte bancaire.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Récapitulatif de la réservation */}
            <div className="lg:col-span-1">
              <Card className="sticky top-4">
                <CardHeader>
                  <CardTitle>Récapitulatif</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <MapPin className="w-4 h-4 text-gray-500" />
                    <div>
                      <div className="font-medium">{field.name}</div>
                      <div className="text-sm text-gray-600">{field.location}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <span className="text-sm">
                      {paymentData.selectedDate.toLocaleDateString('fr-FR', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <Clock className="w-4 h-4 text-gray-500" />
                    <span className="text-sm">
                      {paymentData.selectedStartTime} - {paymentData.selectedEndTime}
                    </span>
                  </div>

                  <Separator />
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Prix du terrain</span>
                      <span>{paymentData.totalPrice.toLocaleString()} XOF</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Frais de service</span>
                      <span>0 XOF</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-medium">
                      <span>Total</span>
                      <span>{paymentData.totalPrice.toLocaleString()} XOF</span>
                    </div>
                  </div>

                  <Button 
                    className="w-full bg-green-600 hover:bg-green-700"
                    onClick={handleProceedToPayment}
                    disabled={!selectedMethod}
                  >
                    Continuer vers le paiement
                  </Button>

                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <div className="flex items-start space-x-2">
                      <Clock className="w-4 h-4 text-yellow-600 mt-0.5" />
                      <div className="text-xs text-yellow-800">
                        <p className="font-medium mb-1">Paiement direct au propriétaire</p>
                        <p>Le paiement se fait directement avec le propriétaire du terrain selon la méthode choisie.</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentPage;
