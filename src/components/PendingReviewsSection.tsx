
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Star, Calendar, Clock, MapPin, Sparkles } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import ReviewDialog from '@/components/ReviewDialog';

interface Booking {
  id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  fields: {
    id: string;
    name: string;
    location: string;
    address: string;
  };
}

interface PendingReviewsSectionProps {
  pendingReviews: Booking[];
  onReviewSubmitted: () => void;
}

const PendingReviewsSection: React.FC<PendingReviewsSectionProps> = ({ 
  pendingReviews, 
  onReviewSubmitted 
}) => {
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  const handleReview = (booking: Booking) => {
    setSelectedBooking(booking);
    setReviewDialogOpen(true);
  };

  const handleReviewSubmitted = () => {
    onReviewSubmitted();
    setReviewDialogOpen(false);
  };

  if (pendingReviews.length === 0) return null;

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'EEEE dd MMMM yyyy', { locale: fr });
  };

  const formatTime = (timeString: string) => {
    return timeString.slice(0, 5);
  };

  return (
    <>
      <Card className="border-2 border-orange-200 bg-gradient-to-r from-orange-50 to-yellow-50 shadow-lg">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center text-orange-800">
            <Sparkles className="w-5 h-5 mr-2 text-orange-600" />
            Avis en attente ({pendingReviews.length})
          </CardTitle>
          <p className="text-sm text-orange-700">
            Partagez votre expérience et aidez la communauté !
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {pendingReviews.map((booking) => (
              <div 
                key={booking.id} 
                className="bg-white/80 backdrop-blur-sm rounded-lg p-4 border border-orange-100 hover:bg-white/90 transition-all duration-200"
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold text-lg text-gray-800">{booking.fields.name}</h3>
                    <div className="flex items-center text-gray-600 text-sm mt-1">
                      <MapPin className="w-4 h-4 mr-1" />
                      {booking.fields.location}
                    </div>
                  </div>
                  <Button 
                    onClick={() => handleReview(booking)}
                    className="bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-white shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105"
                    size="sm"
                  >
                    <Star className="w-4 h-4 mr-2" />
                    Laisser un avis
                  </Button>
                </div>
                
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 mr-1" />
                    {formatDate(booking.booking_date)}
                  </div>
                  <div className="flex items-center">
                    <Clock className="w-4 h-4 mr-1" />
                    {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <ReviewDialog
        open={reviewDialogOpen}
        onOpenChange={setReviewDialogOpen}
        booking={selectedBooking}
        onReviewSubmitted={handleReviewSubmitted}
      />
    </>
  );
};

export default PendingReviewsSection;
