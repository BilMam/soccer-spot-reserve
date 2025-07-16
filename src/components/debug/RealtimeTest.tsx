import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface RealtimeTestProps {
  fieldId: string;
  fieldName: string;
}

const RealtimeTest: React.FC<RealtimeTestProps> = ({ fieldId, fieldName }) => {
  const [bookings, setBookings] = useState<any[]>([]);
  const [realtimeEvents, setRealtimeEvents] = useState<string[]>([]);
  const [isListening, setIsListening] = useState(false);

  // Récupérer les réservations
  const fetchBookings = async () => {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('field_id', fieldId)
      .in('status', ['pending', 'confirmed', 'owner_confirmed'])
      .order('created_at', { ascending: false });

    if (!error && data) {
      setBookings(data);
      console.log('📊 Réservations actuelles:', data.length);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [fieldId]);

  useEffect(() => {
    if (!isListening) return;

    console.log('🔄 Activation listener temps réel pour:', fieldId);
    
    const channel = supabase
      .channel('realtime-test')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
          filter: `field_id=eq.${fieldId}`
        },
        (payload) => {
          const timestamp = new Date().toLocaleTimeString();
          const eventMsg = `${timestamp} - ${payload.eventType}: ${(payload.new as any)?.id || (payload.old as any)?.id}`;
          
          console.log('🔄 Événement temps réel reçu:', payload);
          setRealtimeEvents(prev => [eventMsg, ...prev.slice(0, 9)]);
          
          // Rafraîchir les données
          setTimeout(fetchBookings, 100);
        }
      )
      .subscribe();

    return () => {
      console.log('🔄 Nettoyage listener');
      supabase.removeChannel(channel);
    };
  }, [fieldId, isListening]);

  return (
    <Card className="w-full max-w-2xl mx-auto mt-4">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Test Temps Réel - {fieldName}
          <Button 
            onClick={() => setIsListening(!isListening)}
            variant={isListening ? "destructive" : "default"}
            size="sm"
          >
            {isListening ? "Arrêter" : "Démarrer"} listener
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h3 className="font-medium mb-2">Réservations actuelles ({bookings.length})</h3>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {bookings.map(booking => (
              <div key={booking.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <span className="text-sm">
                  {booking.booking_date} {booking.start_time}-{booking.end_time}
                </span>
                <div className="flex space-x-2">
                  <Badge variant="outline">{booking.status}</Badge>
                  <Badge variant="secondary">{booking.payment_status}</Badge>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-medium">Événements temps réel</h3>
            <Badge variant={isListening ? "default" : "secondary"}>
              {isListening ? "En écoute" : "Arrêté"}
            </Badge>
          </div>
          <div className="space-y-1 max-h-40 overflow-y-auto bg-gray-50 p-2 rounded text-xs">
            {realtimeEvents.length === 0 ? (
              <p className="text-gray-500">Aucun événement détecté</p>
            ) : (
              realtimeEvents.map((event, index) => (
                <div key={index} className="text-gray-700">{event}</div>
              ))
            )}
          </div>
        </div>

        <div className="text-sm text-gray-600">
          <p><strong>Test:</strong> Effectuez une réservation sur ce terrain depuis un autre onglet ou appareil.</p>
          <p><strong>Résultat attendu:</strong> La réservation doit apparaître ici instantanément.</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default RealtimeTest;