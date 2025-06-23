
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, User, MapPin, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import BookingStatusBadge from './BookingStatusBadge';

interface BookingCardProps {
  booking: any;
}

const BookingCard: React.FC<BookingCardProps> = ({ booking }) => {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{booking.fields.name}</CardTitle>
          <BookingStatusBadge 
            status={booking.status} 
            escrowStatus="none"
            windowType={null}
          />
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center space-x-2">
            <User className="w-4 h-4 text-gray-500" />
            <span>{booking.profiles.full_name}</span>
          </div>
          
          <div className="flex items-center space-x-2">
            <MapPin className="w-4 h-4 text-gray-500" />
            <span>{booking.fields.location}</span>
          </div>
          
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-gray-500" />
            <span>{format(new Date(booking.booking_date), 'dd/MM/yyyy', { locale: fr })}</span>
          </div>
          
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-gray-500" />
            <span>{booking.start_time.slice(0, 5)} - {booking.end_time.slice(0, 5)}</span>
          </div>
          
          <div className="flex items-center space-x-2">
            <DollarSign className="w-4 h-4 text-gray-500" />
            <span>{booking.total_price.toLocaleString()} XOF</span>
          </div>
          
          {booking.player_count && (
            <div className="flex items-center space-x-2">
              <User className="w-4 h-4 text-gray-500" />
              <span>{booking.player_count} joueurs</span>
            </div>
          )}
        </div>

        {booking.special_requests && (
          <div className="bg-gray-50 rounded-lg p-3">
            <h4 className="font-medium text-gray-900 mb-1">Demandes spéciales :</h4>
            <p className="text-gray-600 text-sm">{booking.special_requests}</p>
          </div>
        )}

        {/* Message informatif pour le workflow */}
        {booking.status === 'pending' && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-yellow-600" />
              <span className="text-sm text-yellow-800">
                En attente de paiement
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BookingCard;
