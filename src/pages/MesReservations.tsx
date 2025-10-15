import React, { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import UserBookings from '@/components/UserBookings';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

const MesReservations = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Vérifier si on arrive depuis un paiement
  useEffect(() => {
    const ref = searchParams.get('ref');
    if (ref && user) {
      // Vérifier le statut de la réservation
      const checkBookingStatus = async () => {
        const { data: booking } = await supabase
          .from('bookings')
          .select('id, status, payment_status, fields(name)')
          .eq('payment_intent_id', ref)
          .eq('user_id', user.id)
          .single();

        if (booking) {
          if (booking.status === 'confirmed' && booking.payment_status === 'paid') {
            toast({
              title: "✅ Paiement confirmé !",
              description: `Votre réservation pour ${booking.fields?.name} est confirmée.`,
              duration: 5000,
            });
          } else if (booking.status === 'provisional') {
            toast({
              title: "⏳ Traitement en cours...",
              description: "Votre paiement est en cours de traitement. Vous recevrez une confirmation.",
              duration: 5000,
            });
          } else {
            toast({
              title: "❌ Problème de paiement",
              description: "Un problème est survenu avec votre paiement. Contactez le support si nécessaire.",
              variant: "destructive",
              duration: 8000,
            });
          }
        }
      };

      checkBookingStatus();
      
      // Forcer le rafraîchissement des réservations après vérification du paiement
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['user-bookings', user.id] });
      }, 300);
    }
  }, [searchParams, user, toast, queryClient]);

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container mx-auto px-4 py-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Accès non autorisé</h1>
          <p className="text-gray-600">Vous devez être connecté pour accéder à vos réservations.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Mes Réservations</h1>
          <p className="text-gray-600 mt-1">Consultez et gérez toutes vos réservations</p>
        </div>

        <UserBookings userId={user.id} />
      </div>
    </div>
  );
};

export default MesReservations;