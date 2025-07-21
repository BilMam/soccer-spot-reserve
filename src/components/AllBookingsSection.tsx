
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import BookingCard from './BookingCard';

interface AllBookingsSectionProps {
  bookings: any[];
}

const AllBookingsSection: React.FC<AllBookingsSectionProps> = ({ bookings }) => {
  // Filtrer pour ne montrer que les réservations confirmées/terminées/annulées
  const activeBookings = bookings.filter(booking => 
    ['confirmed', 'owner_confirmed', 'completed', 'cancelled'].includes(booking.status)
  );

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">
        Toutes les réservations ({activeBookings.length})
      </h3>
      <div className="space-y-4">
        {activeBookings.map((booking) => (
          <BookingCard key={booking.id} booking={booking} />
        ))}

        {activeBookings.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-gray-500">Aucune réservation pour le moment</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default AllBookingsSection;
