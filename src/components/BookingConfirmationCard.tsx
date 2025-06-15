
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Clock, User, MapPin, DollarSign, AlertTriangle, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface BookingConfirmationCardProps {
  booking: {
    id: string;
    booking_date: string;
    start_time: string;
    end_time: string;
    total_price: number;
    owner_amount: number;
    platform_fee: number;
    player_count: number;
    status: string;
    escrow_status: string;
    confirmation_deadline: string;
    owner_confirmed_at: string;
    profiles: {
      full_name: string;
      email: string;
    };
    fields: {
      name: string;
      location: string;
    };
  };
  onConfirm?: () => void;
}

const BookingConfirmationCard: React.FC<BookingConfirmationCardProps> = ({ 
  booking, 
  onConfirm 
}) => {
  const { toast } = useToast();
  const [isConfirming, setIsConfirming] = useState(false);

  const handleConfirmBooking = async () => {
    setIsConfirming(true);
    try {
      const { data, error } = await supabase.functions.invoke('confirm-booking-owner', {
        body: { booking_id: booking.id }
      });

      if (error) throw error;

      toast({
        title: "Réservation confirmée !",
        description: "Le transfert sera effectué sous 5 minutes. Le client a été notifié.",
      });

      onConfirm?.();
    } catch (error: any) {
      console.error('Erreur confirmation réservation:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de confirmer la réservation",
        variant: "destructive"
      });
    } finally {
      setIsConfirming(false);
    }
  };

  const getTimeRemaining = () => {
    if (!booking.confirmation_deadline) return null;
    
    const deadline = new Date(booking.confirmation_deadline);
    const now = new Date();
    const diff = deadline.getTime() - now.getTime();
    
    if (diff <= 0) return 'Expiré';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m restantes`;
    } else {
      return `${minutes}m restantes`;
    }
  };

  const timeRemaining = getTimeRemaining();
  const isExpired = timeRemaining === 'Expiré';
  const isUrgent = booking.confirmation_deadline && 
    new Date(booking.confirmation_deadline).getTime() - new Date().getTime() < 2 * 60 * 60 * 1000; // 2h

  if (booking.owner_confirmed_at) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-green-700">
            <CheckCircle className="w-5 h-5" />
            <span>Réservation confirmée</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm text-green-600">
            Confirmée le {format(new Date(booking.owner_confirmed_at), 'dd/MM/yyyy à HH:mm', { locale: fr })}
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center space-x-2">
              <User className="w-4 h-4 text-gray-500" />
              <span>{booking.profiles.full_name}</span>
            </div>
            <div className="flex items-center space-x-2">
              <MapPin className="w-4 h-4 text-gray-500" />
              <span>{booking.fields.name}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-gray-500" />
              <span>{format(new Date(booking.booking_date), 'dd/MM/yyyy', { locale: fr })}</span>
            </div>
            <div className="flex items-center space-x-2">
              <DollarSign className="w-4 h-4 text-gray-500" />
              <span>{booking.owner_amount?.toLocaleString()} XOF</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`${isExpired ? 'border-red-200 bg-red-50' : isUrgent ? 'border-yellow-200 bg-yellow-50' : 'border-blue-200 bg-blue-50'}`}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center space-x-2">
            <AlertTriangle className={`w-5 h-5 ${isExpired ? 'text-red-600' : isUrgent ? 'text-yellow-600' : 'text-blue-600'}`} />
            <span>Confirmation requise</span>
          </span>
          <Badge variant={isExpired ? 'destructive' : isUrgent ? 'secondary' : 'default'}>
            {timeRemaining}
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Information client */}
        <div className="bg-white rounded-lg p-3 space-y-2">
          <div className="flex items-center space-x-2">
            <User className="w-4 h-4 text-gray-500" />
            <span className="font-medium">{booking.profiles.full_name}</span>
          </div>
          <div className="flex items-center space-x-2">
            <MapPin className="w-4 h-4 text-gray-500" />
            <span>{booking.fields.name}</span>
          </div>
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-gray-500" />
            <span>
              {format(new Date(booking.booking_date), 'EEEE dd MMMM yyyy', { locale: fr })} - 
              {booking.start_time.slice(0, 5)} à {booking.end_time.slice(0, 5)}
            </span>
          </div>
        </div>

        {/* Informations financières */}
        <div className="bg-white rounded-lg p-3 space-y-2">
          <div className="flex justify-between">
            <span>Montant total payé :</span>
            <span className="font-medium">{booking.total_price.toLocaleString()} XOF</span>
          </div>
          <div className="flex justify-between">
            <span>Commission plateforme :</span>
            <span className="text-gray-600">{booking.platform_fee?.toLocaleString()} XOF</span>
          </div>
          <div className="flex justify-between border-t pt-2">
            <span className="font-medium">Votre part :</span>
            <span className="font-bold text-green-600">{booking.owner_amount?.toLocaleString()} XOF</span>
          </div>
        </div>

        {/* Protection escrow */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <h4 className="font-medium text-blue-900 mb-1">🔒 Protection Escrow</h4>
          <p className="text-sm text-blue-800">
            Les fonds sont sécurisés sur la plateforme. En confirmant, vous autorisez le transfert vers votre compte.
          </p>
        </div>

        {/* Deadline info */}
        {!isExpired && (
          <div className={`${isUrgent ? 'bg-yellow-50 border-yellow-200' : 'bg-gray-50 border-gray-200'} border rounded-lg p-3`}>
            <p className={`text-sm ${isUrgent ? 'text-yellow-800' : 'text-gray-600'}`}>
              {isUrgent ? '⚠️ ' : ''}
              Vous devez confirmer avant le {format(new Date(booking.confirmation_deadline), 'dd/MM/yyyy à HH:mm', { locale: fr })}
              {isUrgent ? ' ou le client sera automatiquement remboursé.' : '.'}
            </p>
          </div>
        )}

        {/* Actions */}
        {!isExpired ? (
          <Button 
            onClick={handleConfirmBooking}
            disabled={isConfirming}
            className="w-full bg-green-600 hover:bg-green-700"
            size="lg"
          >
            {isConfirming ? "Confirmation..." : "Confirmer la réservation"}
          </Button>
        ) : (
          <div className="text-center text-red-600 font-medium">
            Délai expiré - Remboursement automatique en cours
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BookingConfirmationCard;
