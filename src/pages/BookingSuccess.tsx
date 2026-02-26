
import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import Navbar from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Calendar, Clock, MapPin, Shield } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const BookingSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const sessionId = searchParams.get('session_id');

  const { data: booking, isLoading } = useQuery({
    queryKey: ['booking-success', sessionId],
    queryFn: async () => {
      if (!sessionId) throw new Error('ID de session manquant');

      // Récupérer la réservation via l'ID de session
      const bookingId = sessionId.replace('booking_', '');
      
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          fields (name, location, address),
          profiles (full_name, email)
        `)
        .eq('id', bookingId)
        .single();

      if (error) throw error;

      // Marquer le paiement comme confirmé si ce n'est pas déjà fait
      const isDeposit = data.payment_type === 'deposit';
      const expectedStatus = isDeposit ? 'deposit_paid' : 'paid';

      if (data.payment_status !== expectedStatus && data.payment_status !== 'paid') {
        await supabase
          .from('bookings')
          .update({
            payment_status: expectedStatus,
            status: 'confirmed',
            ...(isDeposit ? { deposit_paid: true } : {}),
            updated_at: new Date().toISOString()
          })
          .eq('id', data.id);

        // Envoyer l'email de confirmation
        await supabase.functions.invoke('send-booking-email', {
          body: {
            booking_id: data.id,
            notification_type: 'payment_confirmation'
          }
        });
      }

      return data;
    },
    enabled: !!sessionId
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardContent className="p-8">
                <div className="animate-pulse space-y-4">
                  <div className="h-8 bg-gray-200 rounded w-1/2 mx-auto"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto"></div>
                  <div className="h-32 bg-gray-200 rounded"></div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto text-center">
            <Card>
              <CardContent className="p-8">
                <h1 className="text-2xl font-bold text-red-600 mb-4">Réservation introuvable</h1>
                <p className="text-gray-600 mb-6">
                  Nous n'avons pas pu trouver votre réservation. Veuillez vérifier votre email ou contacter le support.
                </p>
                <Button onClick={() => navigate('/')}>
                  Retour à l'accueil
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  const isDeposit = booking.payment_type === 'deposit';

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Confirmation de succès */}
          <Card className="mb-8">
            <CardContent className="p-8 text-center">
              <div className={`w-16 h-16 ${isDeposit ? 'bg-emerald-100' : 'bg-green-100'} rounded-full flex items-center justify-center mx-auto mb-4`}>
                {isDeposit ? (
                  <Shield className="w-8 h-8 text-emerald-600" />
                ) : (
                  <CheckCircle className="w-8 h-8 text-green-600" />
                )}
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {isDeposit ? 'Terrain bloqué !' : 'Réservation confirmée !'}
              </h1>
              {isDeposit && (
                <span className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-700 text-sm font-medium px-3 py-1 rounded-full mb-3">
                  <Shield className="w-4 h-4" />
                  Garantie Terrain Bloqué
                </span>
              )}
              <p className="text-gray-600">
                {isDeposit
                  ? 'Votre avance a été payée avec succès. Le terrain est bloqué pour vous.'
                  : 'Votre paiement a été traité avec succès et votre réservation est confirmée.'}
              </p>
            </CardContent>
          </Card>

          {/* Détails de la réservation */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Détails de votre réservation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-3">
                <MapPin className="w-5 h-5 text-gray-500" />
                <div>
                  <div className="font-medium">{booking.fields.name}</div>
                  <div className="text-gray-600 text-sm">{booking.fields.location}</div>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <Calendar className="w-5 h-5 text-gray-500" />
                <span>
                  {format(new Date(booking.booking_date), 'EEEE dd MMMM yyyy', { locale: fr })}
                </span>
              </div>

              <div className="flex items-center space-x-3">
                <Clock className="w-5 h-5 text-gray-500" />
                <span>{booking.start_time} - {booking.end_time}</span>
              </div>

              <div className="border-t pt-4 space-y-2">
                {isDeposit ? (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Avance payée en ligne</span>
                      <span className="text-xl font-bold text-emerald-600">
                        {Math.round(booking.deposit_public_price || booking.total_price).toLocaleString()} XOF
                      </span>
                    </div>
                    <div className="flex items-center justify-between bg-orange-50 p-3 rounded-lg">
                      <span className="font-medium text-orange-700">Solde à régler sur place</span>
                      <span className="text-xl font-bold text-orange-600">
                        {Math.round(booking.balance_due || 0).toLocaleString()} XOF
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Prix total payé</span>
                      <span className="text-xl font-bold text-green-600">
                        {Math.round(booking.total_price).toLocaleString()} XOF
                      </span>
                    </div>
                    {booking.platform_fee && (
                      <div className="text-sm text-gray-600 space-y-1">
                        <div className="flex justify-between">
                          <span>Montant terrain :</span>
                          <span>{Math.round(booking.owner_amount || 0).toLocaleString()} XOF</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Commission plateforme :</span>
                          <span>{Math.round(booking.platform_fee).toLocaleString()} XOF</span>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              {booking.special_requests && (
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-2">Demandes spéciales :</h4>
                  <p className="text-gray-600">{booking.special_requests}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Informations importantes */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Mail className="w-5 h-5" />
                <span>Informations importantes</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {isDeposit && (
                <div className="flex items-start space-x-3 bg-orange-50 p-3 rounded-lg">
                  <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-orange-800 font-medium">
                    Présentez-vous au terrain et réglez le solde de {Math.round(booking.balance_due || 0).toLocaleString()} XOF directement au propriétaire.
                  </p>
                </div>
              )}
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-green-600 rounded-full mt-2"></div>
                <p className="text-gray-700">
                  Un email de confirmation a été envoyé à votre adresse email
                </p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-green-600 rounded-full mt-2"></div>
                <p className="text-gray-700">
                  Vous recevrez un rappel 24h avant votre réservation
                </p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-green-600 rounded-full mt-2"></div>
                <p className="text-gray-700">
                  En cas de besoin, contactez le propriétaire via votre profil
                </p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-green-600 rounded-full mt-2"></div>
                <p className="text-gray-700">
                  <Smartphone className="w-4 h-4 inline mr-1" />
                  Paiement sécurisé traité par PayDunya (Mobile Money & cartes bancaires)
                </p>
              </div>
              {!isDeposit && (
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-green-600 rounded-full mt-2"></div>
                  <p className="text-gray-700">
                    Le propriétaire recevra automatiquement 95% du montant
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex space-x-4">
            <Button 
              variant="outline" 
              onClick={() => navigate('/profile')}
              className="flex-1"
            >
              Voir mes réservations
            </Button>
            <Button 
              onClick={() => navigate('/search')}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              Découvrir d'autres terrains
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingSuccess;
