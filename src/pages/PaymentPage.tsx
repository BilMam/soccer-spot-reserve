
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
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
              <h1 className="text-2xl font-bold">Confirmer et payer</h1>
              <p className="text-gray-600">Choisissez votre mode de paiement</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Section paiement */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">1. Ajoutez un mode de paiement</CardTitle>
                </CardHeader>
                <CardContent>
                  <RadioGroup value={selectedMethod} onValueChange={setSelectedMethod}>
                    {paymentMethods.map((method) => (
                      <div key={method.id} className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                        <RadioGroupItem value={method.id} id={method.id} />
                        <div className="flex items-center space-x-3 flex-1">
                          <div className="p-2 bg-gray-100 rounded">
                            <method.icon className="w-5 h-5 text-gray-600" />
                          </div>
                          <div className="flex-1">
                            <Label htmlFor={method.id} className="flex items-center space-x-2 cursor-pointer">
                              <span className="font-medium">{method.name}</span>
                              {method.popular && (
                                <Badge variant="secondary" className="text-xs">
                                  Populaire
                                </Badge>
                              )}
                            </Label>
                            <p className="text-sm text-gray-600">{method.description}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </RadioGroup>

                  {/* Informations de sécurité */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
                    <div className="flex items-start space-x-3">
                      <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-blue-900">Paiement sécurisé</h4>
                        <p className="text-sm text-blue-800 mt-1">
                          Vos informations de paiement sont protégées par un cryptage de niveau bancaire. 
                          Le paiement se fait directement avec le propriétaire du terrain.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Bouton continuer */}
              <div className="mt-6">
                <Button 
                  className="w-full bg-pink-600 hover:bg-pink-700 text-white py-3 text-lg"
                  onClick={handleProceedToPayment}
                  disabled={!selectedMethod}
                  size="lg"
                >
                  Continuer
                </Button>
              </div>
            </div>

            {/* Récapitulatif de la réservation */}
            <div className="lg:col-span-1">
              <Card className="sticky top-4">
                <CardContent className="p-6">
                  <div className="flex items-start space-x-4 mb-4">
                    <div className="w-20 h-20 bg-gray-200 rounded-lg flex items-center justify-center">
                      <MapPin className="w-8 h-8 text-gray-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{field.name}</h3>
                      <p className="text-sm text-gray-600">{field.location}</p>
                      <div className="flex items-center mt-1">
                        <div className="flex items-center">
                          {[...Array(5)].map((_, i) => (
                            <div key={i} className="w-3 h-3 bg-gray-300 rounded-full mr-1"></div>
                          ))}
                        </div>
                        <span className="text-sm text-gray-600 ml-2">4.8 (12)</span>
                      </div>
                    </div>
                  </div>

                  <Separator className="my-4" />

                  <div className="space-y-3">
                    <h4 className="font-medium">Informations sur la réservation</h4>
                    
                    <div className="flex items-center space-x-2 text-sm">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      <span>
                        {paymentData.selectedDate.toLocaleDateString('fr-FR', {
                          weekday: 'long',
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric'
                        })}
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-2 text-sm">
                      <Clock className="w-4 h-4 text-gray-500" />
                      <span>
                        {paymentData.selectedStartTime} - {paymentData.selectedEndTime}
                      </span>
                    </div>
                  </div>

                  <Separator className="my-4" />
                  
                  <div className="space-y-2">
                    <h4 className="font-medium">Détail du prix</h4>
                    <div className="flex justify-between text-sm">
                      <span>Terrain ({paymentData.playerCount} joueur{paymentData.playerCount > 1 ? 's' : ''})</span>
                      <span>{paymentData.totalPrice.toLocaleString()} XOF</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Frais de service</span>
                      <span>0 XOF</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-semibold">
                      <span>Total (XOF)</span>
                      <span>{paymentData.totalPrice.toLocaleString()} XOF</span>
                    </div>
                  </div>

                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-4">
                    <div className="flex items-start space-x-2">
                      <Clock className="w-4 h-4 text-yellow-600 mt-0.5" />
                      <div className="text-xs text-yellow-800">
                        <p className="font-medium mb-1">Paiement direct</p>
                        <p>Le paiement se fait directement avec le propriétaire selon la méthode choisie.</p>
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
