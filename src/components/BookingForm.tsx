
import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import FieldCalendar from './FieldCalendar';
import BookingDialog from './BookingDialog';

interface BookingFormProps {
  field: {
    id: string;
    name: string;
    location: string;
    address: string;
    price_per_hour: number;
  };
}

const BookingForm: React.FC<BookingFormProps> = ({ field }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<{
    date: Date;
    startTime: string;
    endTime: string;
    price: number;
  } | null>(null);

  const handleTimeSlotSelect = (date: Date, startTime: string, endTime: string, price: number) => {
    if (!user) {
      navigate('/auth');
      return;
    }

    setSelectedBooking({ date, startTime, endTime, price });
    setBookingDialogOpen(true);
  };

  if (!user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Réserver ce terrain</CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-gray-600 mb-4">
            Vous devez être connecté pour réserver un terrain.
          </p>
          <Button 
            onClick={() => navigate('/auth')}
            className="bg-green-600 hover:bg-green-700"
          >
            Se connecter
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Réserver ce terrain</CardTitle>
        </CardHeader>
        <CardContent>
          <FieldCalendar
            fieldId={field.id}
            fieldPrice={field.price_per_hour}
            onTimeSlotSelect={handleTimeSlotSelect}
          />
        </CardContent>
      </Card>

      {selectedBooking && (
        <BookingDialog
          open={bookingDialogOpen}
          onOpenChange={setBookingDialogOpen}
          field={field}
          selectedDate={selectedBooking.date}
          selectedStartTime={selectedBooking.startTime}
          selectedEndTime={selectedBooking.endTime}
          selectedPrice={selectedBooking.price}
        />
      )}
    </>
  );
};

export default BookingForm;
