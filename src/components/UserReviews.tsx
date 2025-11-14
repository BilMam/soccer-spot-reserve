
import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Star, MapPin, Sparkles } from 'lucide-react';
import { usePendingReviews } from '@/hooks/usePendingReviews';
import EnhancedReviewDialog from '@/components/EnhancedReviewDialog';

interface Review {
  id: string;
  rating: number;
  comment: string;
  created_at: string;
  fields: {
    name: string;
    location: string;
  };
}

interface UserReviewsProps {
  userId: string;
}

const UserReviews: React.FC<UserReviewsProps> = ({ userId }) => {
  const queryClient = useQueryClient();
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const { pendingReviews } = usePendingReviews();

  const { data: reviews, isLoading } = useQuery({
    queryKey: ['user-reviews', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reviews')
        .select(`
          *,
          fields (
            name,
            location
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Review[];
    }
  });

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${
          i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
        }`}
      />
    ));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleReview = (booking: any) => {
    setSelectedBooking(booking);
    setReviewDialogOpen(true);
  };

  const handleReviewSubmitted = () => {
    queryClient.invalidateQueries({ queryKey: ['user-reviews', userId] });
    queryClient.invalidateQueries({ queryKey: ['pending-reviews', userId] });
    setReviewDialogOpen(false);
    setSelectedBooking(null);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Mes Avis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="animate-pulse space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-gray-200 h-24 rounded"></div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Pending Reviews - Simple et discret style Uber */}
        {pendingReviews.length > 0 && (
          <Card className="border-l-4 border-l-yellow-400 bg-gradient-to-r from-yellow-50 to-white">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <Sparkles className="w-5 h-5 text-yellow-600 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {pendingReviews.length} {pendingReviews.length === 1 ? 'avis en attente' : 'avis en attente'}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Partagez votre expérience en quelques secondes
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="mt-4 space-y-2">
                {pendingReviews.slice(0, 3).map((booking) => (
                  <div 
                    key={booking.id}
                    className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-100"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">
                        {booking.fields.name}
                      </p>
                      <p className="text-sm text-gray-500 truncate">
                        {booking.fields.location}
                      </p>
                    </div>
                    <Button
                      onClick={() => handleReview(booking)}
                      size="sm"
                      className="ml-3 flex-shrink-0"
                    >
                      <Star className="w-4 h-4 mr-1" />
                      Noter
                    </Button>
                  </div>
                ))}
              </div>
              
              {pendingReviews.length > 3 && (
                <p className="text-xs text-gray-500 mt-3 text-center">
                  +{pendingReviews.length - 3} autre{pendingReviews.length - 3 > 1 ? 's' : ''} à noter
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Published Reviews */}
        <Card>
          <CardHeader>
            <CardTitle>Mes Avis Publiés ({reviews?.length || 0})</CardTitle>
          </CardHeader>
          <CardContent>
            {!reviews || reviews.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Star className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>Aucun avis publié</p>
                <p className="text-sm">Réservez et jouez pour laisser vos premiers avis !</p>
              </div>
            ) : (
              <div className="space-y-4">
                {reviews.map((review) => (
                  <div key={review.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold">{review.fields.name}</h3>
                        <div className="flex items-center text-gray-600 text-sm mt-1">
                          <MapPin className="w-4 h-4 mr-1" />
                          {review.fields.location}
                        </div>
                      </div>
                      <div className="text-sm text-gray-500">
                        {formatDate(review.created_at)}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 mb-3">
                      <div className="flex items-center space-x-1">
                        {renderStars(review.rating)}
                      </div>
                      <span className="text-sm text-gray-600">({review.rating}/5)</span>
                    </div>

                    {review.comment && (
                      <p className="text-gray-700 leading-relaxed">
                        {review.comment}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <EnhancedReviewDialog
        open={reviewDialogOpen}
        onOpenChange={setReviewDialogOpen}
        booking={selectedBooking}
        onReviewSubmitted={handleReviewSubmitted}
      />
    </>
  );
};

export default UserReviews;
