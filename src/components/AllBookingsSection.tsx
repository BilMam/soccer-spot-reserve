
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import BookingCard from './BookingCard';

interface AllBookingsSectionProps {
  bookings: any[];
}

const AllBookingsSection: React.FC<AllBookingsSectionProps> = ({ bookings }) => {
  // Filtrer les réservations pour masquer les tentatives échouées/expirées
  const activeBookings = bookings.filter(booking => 
    !['failed', 'expired'].includes(booking.status)
  );
  
  const expiredBookings = bookings.filter(booking => 
    ['failed', 'expired'].includes(booking.status)
  );

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">
        Réservations actives ({activeBookings.length})
      </h3>
      <div className="space-y-4">
        {activeBookings.map((booking) => (
          <BookingCard key={booking.id} booking={booking} />
        ))}

        {activeBookings.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-gray-500">Aucune réservation active pour le moment</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Section tentatives expirées/échouées (pliable) */}
      {expiredBookings.length > 0 && (
        <details className="mt-8">
          <summary className="text-sm font-medium text-gray-600 cursor-pointer hover:text-gray-800">
            Tentatives expirées/échouées ({expiredBookings.length})
          </summary>
          <div className="mt-4 space-y-2 opacity-60">
            {expiredBookings.map((booking) => (
              <BookingCard key={booking.id} booking={booking} />
            ))}
          </div>
        </details>
      )}
    </div>
  );
};

export default AllBookingsSection;
