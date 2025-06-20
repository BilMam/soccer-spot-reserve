
import React, { useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { 
  ArrowLeft,
  Info,
  Calendar,
  Clock,
  Star
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
      id: 'orange_money',
      name: 'Orange Money',
      bgColor: 'bg-orange-500',
      textColor: 'text-white'
    },
    {
      id: 'mtn_money',
      name: 'MTN Mobile Money',
      bgColor: 'bg-yellow-500',
      textColor: 'text-white'
    },
    {
      id: 'moov_money',
      name: 'Moov Money',
      bgColor: 'bg-blue-500',
      textColor: 'text-white'
    },
    {
      id: 'wave',
      name: 'Wave',
      bgColor: 'bg-blue-600',
      textColor: 'text-white'
    },
    {
      id: 'visa_mastercard',
      name: 'Visa / Mastercard',
      bgColor: 'bg-gray-800',
      textColor: 'text-white'
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

  const calculateDuration = () => {
    const start = new Date(`2000-01-01 ${paymentData.selectedStartTime}`);
    const end = new Date(`2000-01-01 ${paymentData.selectedEndTime}`);
    const diffMs = end.getTime() - start.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    return diffHours;
  };

  const duration = calculateDuration();
  const platformFee = Math.round(paymentData.totalPrice * 0.05);

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Header */}
        <div className="flex items-center mb-8">
          <Button 
            variant="ghost" 
            onClick={() => navigate(`/field/${id}`)}
            className="mr-4 p-2"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <span className="text-lg">Retour au terrain</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Section paiement */}
          <div className="order-2 lg:order-1">
            <h1 className="text-3xl font-semibold mb-8">Choisir votre moyen de paiement</h1>
            
            <div className="space-y-4 mb-8">
              <RadioGroup value={selectedMethod} onValueChange={setSelectedMethod}>
                {paymentMethods.map((method) => (
                  <div key={method.id} className="border border-gray-300 rounded-xl p-4 hover:border-gray-400 transition-colors">
                    <Label htmlFor={method.id} className="flex items-center space-x-4 cursor-pointer w-full">
                      <RadioGroupItem value={method.id} id={method.id} />
                      <div className={`w-12 h-8 ${method.bgColor} rounded flex items-center justify-center`}>
                        <div className="w-6 h-6 bg-white bg-opacity-20 rounded"></div>
                      </div>
                      <span className="font-medium text-lg">{method.name}</span>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            {/* Informations de sécurité */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-8">
              <div className="flex items-start space-x-3">
                <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-blue-900 mb-1">Paiement 100% sécurisé</h4>
                  <p className="text-sm text-blue-800">
                    Vos fonds sont protégés jusqu'à confirmation de votre réservation par le propriétaire.
                  </p>
                </div>
              </div>
            </div>

            {/* Bouton payer - affiché en bas sur mobile/tablette */}
            <div className="lg:hidden">
              <Button 
                className="w-full bg-green-600 hover:bg-green-700 text-white py-4 text-lg font-semibold rounded-xl"
                onClick={handleProceedToPayment}
                disabled={!selectedMethod}
                size="lg"
              >
                Payer {(paymentData.totalPrice + platformFee).toLocaleString()} XOF
              </Button>
            </div>
          </div>

          {/* Récapitulatif de la réservation */}
          <div className="order-1 lg:order-2">
            <div className="sticky top-6">
              {/* Terrain info */}
              <div className="flex items-start space-x-4 mb-6">
                <div className="w-20 h-20 bg-gray-200 rounded-xl overflow-hidden flex-shrink-0">
                  {field.images && field.images.length > 0 ? (
                    <img 
                      src={field.images[0]} 
                      alt={field.name} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <img 
                      src="/lovable-uploads/28043dec-e1a0-47ea-ae2f-6260d4df83ab.png" 
                      alt={field.name} 
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{field.name}</h3>
                  <p className="text-gray-600 flex items-center">
                    <span className="mr-2">📍</span>
                    {field.location}
                  </p>
                  <div className="flex items-center mt-1">
                    <Star className="w-4 h-4 text-yellow-400 fill-current" />
                    <span className="text-sm text-gray-600 ml-1">0 (0)</span>
                    <Badge variant="secondary" className="ml-2 text-xs">
                      {field.field_type}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="space-y-4 mb-6">
                <div className="flex items-center space-x-3">
                  <Calendar className="w-5 h-5 text-gray-600" />
                  <span className="text-lg">
                    {paymentData.selectedDate.toLocaleDateString('fr-FR', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </span>
                </div>
                
                <div className="flex items-center space-x-3">
                  <Clock className="w-5 h-5 text-gray-600" />
                  <span className="text-lg">
                    {paymentData.selectedStartTime} - {paymentData.selectedEndTime}
                  </span>
                </div>
                
                <div className="text-gray-600">
                  {duration} heure{duration > 1 ? 's' : ''}
                </div>
              </div>

              <hr className="border-gray-200 my-6" />
              
              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-lg">
                  <span>{field.price_per_hour.toLocaleString()} XOF × {duration}h</span>
                  <span>{paymentData.totalPrice.toLocaleString()} XOF</span>
                </div>
                <div className="flex justify-between text-lg">
                  <span>Commission plateforme (5%)</span>
                  <span>{platformFee.toLocaleString()} XOF</span>
                </div>
              </div>

              <hr className="border-gray-200 my-6" />
              
              <div className="flex justify-between text-xl font-semibold mb-6">
                <span>Total</span>
                <span className="text-green-600">{(paymentData.totalPrice + platformFee).toLocaleString()} XOF</span>
              </div>

              {/* Bouton payer - affiché uniquement sur desktop */}
              <div className="hidden lg:block">
                <Button 
                  className="w-full bg-green-600 hover:bg-green-700 text-white py-4 text-lg font-semibold rounded-xl"
                  onClick={handleProceedToPayment}
                  disabled={!selectedMethod}
                  size="lg"
                >
                  Payer {(paymentData.totalPrice + platformFee).toLocaleString()} XOF
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentPage;
